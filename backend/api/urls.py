from django.urls import path
from . import views

urlpatterns = [
    path('batches/', views.batch_list_create, name='batch-list-create'),
    path('batches/<int:pk>/claim/', views.claim_batch, name='batch-claim'),
    path('metrics/', views.impact_metrics, name='impact-metrics'),
    path('scan/', views.scan_waste_image, name='scan-waste-image'),
]
