from django.db import transaction
from django.db.models import Sum, Count
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import WasteBatch
from .serializers import WasteBatchSerializer


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
