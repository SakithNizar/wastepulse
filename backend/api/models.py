from django.db import models


class WasteBatch(models.Model):
    CATEGORY_CHOICES = [
        ('ORGANIC', 'Organic & Food Surplus'),
        ('PLASTIC', 'Recyclable Plastics (PET/HDPE)'),
        ('CARDBOARD', 'Clean Cardboard & Paper'),
        ('METAL', 'Scrap Metal & Aluminum'),
        ('GLASS', 'Sorted Glass'),
        ('EWASTE', 'Electronic Components'),
    ]

    STATUS_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('CLAIMED', 'Claimed'),
        ('COLLECTED', 'Collected'),
    ]

    title = models.CharField(max_length=150)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='ORGANIC')
    weight_kg = models.FloatField()
    contamination_score = models.FloatField(default=0.0, help_text="0.0 (Clean) to 1.0 (Heavily Contaminated)")
    co2_saved_kg = models.FloatField(default=0.0)
    location_name = models.CharField(max_length=150)
    latitude = models.FloatField(default=6.9271)
    longitude = models.FloatField(default=79.8612)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='AVAILABLE')
    claimed_by = models.CharField(max_length=100, blank=True, null=True)
    ai_notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.co2_saved_kg and self.weight_kg:
            self.co2_saved_kg = round(self.weight_kg * 1.8, 2)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.weight_kg} kg - {self.status})"
