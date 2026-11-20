from rest_framework import serializers
from .models import WasteBatch


class WasteBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = WasteBatch
        fields = '__all__'
        read_only_fields = ['id', 'co2_saved_kg', 'created_at']
