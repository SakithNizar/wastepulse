import os
import json
from io import BytesIO
from PIL import Image
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

from django.db import transaction
from django.db.models import Sum, Count
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from .models import WasteBatch
from .serializers import WasteBatchSerializer
from .ml_forecast import train_and_predict_surplus


class WasteScanSchema(BaseModel):
    suggested_title: str = Field(
        description="Short descriptive title of the waste/surplus batch, e.g. 'Sorted PET Plastic Bottles'"
    )
    category: str = Field(
        description="Must be one of: ORGANIC, PLASTIC, CARDBOARD, METAL, GLASS, EWASTE"
    )
    contamination_score: float = Field(
        description="Float from 0.0 (completely clean/sorted) to 1.0 (heavily contaminated with food residue, liquids, or mixed non-recyclables)"
    )
    estimated_weight_kg: float = Field(
        description="Estimated weight of the visible batch in kilograms (minimum 0.5)"
    )
    is_recyclable: bool = Field(
        description="True if the batch is clean enough for direct recycling, composting, or redistribution"
    )
    ai_notes: str = Field(
        description="Concise 1-2 sentence assessment detailing visible contaminants, sorting quality, and recommended handling"
    )


@api_view(['GET', 'POST'])
def batch_list_create(request):
    if request.method == 'GET':
        batches = WasteBatch.objects.all().order_by('-created_at')
        serializer = WasteBatchSerializer(batches, many=True)
        return Response(serializer.data)

    serializer = WasteBatchSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def claim_batch(request, pk):
    claimer_name = request.data.get('claimed_by', 'Partner Collector')

    with transaction.atomic():
        try:
            batch = WasteBatch.objects.select_for_update().get(pk=pk)
        except WasteBatch.DoesNotExist:
            return Response({'error': 'Batch not found.'}, status=status.HTTP_404_NOT_FOUND)

        if batch.status != 'AVAILABLE':
            return Response(
                {'error': f'Batch already {batch.status.lower()} by {batch.claimed_by}.'},
                status=status.HTTP_409_CONFLICT
            )

        batch.status = 'CLAIMED'
        batch.claimed_by = claimer_name
        batch.save()

        serializer = WasteBatchSerializer(batch)
        return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
def impact_metrics(request):
    aggregates = WasteBatch.objects.aggregate(
        total_weight_kg=Sum('weight_kg'),
        total_co2_saved_kg=Sum('co2_saved_kg'),
        total_batches=Count('id'),
    )
    diverted_batches = WasteBatch.objects.filter(status__in=['CLAIMED', 'COLLECTED']).count()

    return Response({
        'total_weight_kg': round(aggregates['total_weight_kg'] or 0.0, 2),
        'total_co2_saved_kg': round(aggregates['total_co2_saved_kg'] or 0.0, 2),
        'total_batches': aggregates['total_batches'] or 0,
        'diverted_batches': diverted_batches,
    })


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def scan_waste_image(request):
    """
    Accepts an uploaded image file ('image'), downscales it for fast inference,
    and runs Gemini Vision with minimal thinking latency and automatic model fallback.
    """
    image_file = request.FILES.get('image')
    if not image_file:
        return Response({'error': 'No image file provided under key "image".'}, status=status.HTTP_400_BAD_REQUEST)

    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        return Response({'error': 'GEMINI_API_KEY is not configured on the server.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        pil_image = Image.open(BytesIO(image_file.read()))
        if pil_image.mode not in ('RGB', 'L'):
            pil_image = pil_image.convert('RGB')
        pil_image.thumbnail((768, 768))
    except Exception as e:
        return Response({'error': f'Invalid image file: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    client = genai.Client(api_key=api_key)

    prompt = (
        "Analyze this image of commercial or household waste/surplus material for a circular economy platform. "
        "Classify the primary material into exactly one of: ORGANIC, PLASTIC, CARDBOARD, METAL, GLASS, EWASTE. "
        "Assess the contamination_score between 0.0 (pristine/clean) and 1.0 (heavily soiled with grease, liquids, or mixed trash). "
        "Estimate the total weight in kg and provide practical sorting/handling notes."
    )

    models_to_try = [
        'gemini-3.1-flash-lite',
        'gemini-3.5-flash-lite',
        'gemini-3.5-flash',
        'gemini-3.8-flash',
    ]

    last_error = None
    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=[pil_image, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type='application/json',
                    response_schema=WasteScanSchema,
                    temperature=0.2,
                    thinking_config=types.ThinkingConfig(thinking_level='MINIMAL'),
                ),
            )
            scan_result = json.loads(response.text)
            scan_result['model_used'] = model_name
            return Response(scan_result, status=status.HTTP_200_OK)
        except Exception as e:
            last_error = f"[{model_name}] {str(e)}"
            continue

    return Response(
        {'error': f'AI scan failed across models {models_to_try}. Last error: {last_error}'},
        status=status.HTTP_503_SERVICE_UNAVAILABLE
    )


@api_view(['GET'])
def surplus_forecast(request):
    business_type = request.query_params.get('business_type', 'SUPERMARKET')
    try:
        days = min(max(int(request.query_params.get('days', 7)), 1), 14)
    except ValueError:
        days = 7

    live_count = WasteBatch.objects.count()
    forecast_data = train_and_predict_surplus(
        business_type=business_type,
        days=days,
        live_batch_count=live_count,
    )
    return Response(forecast_data, status=status.HTTP_200_OK)
