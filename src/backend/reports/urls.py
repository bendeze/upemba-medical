from django.urls import path
from .views import DashboardOverviewAPIView, PharmacyReportsAPIView, ConsultationReportsAPIView, ExportReportAPIView

urlpatterns = [
    path('overview/', DashboardOverviewAPIView.as_view(), name='reports-overview'),
    path('pharmacy/', PharmacyReportsAPIView.as_view(), name='reports-pharmacy'),
    path('consultations/', ConsultationReportsAPIView.as_view(), name='reports-consultations'),
    path('export/', ExportReportAPIView.as_view(), name='reports-export'),
]
