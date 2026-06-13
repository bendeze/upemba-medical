from django.contrib import admin
from .models import Medicine, MedicineBatch, PharmacyStock, StockMovement, GlobalSettings, MedicalCenter

@admin.register(GlobalSettings)
class GlobalSettingsAdmin(admin.ModelAdmin):
    list_display = ('id', 'general_min_stock_level', 'updated_at')

@admin.register(MedicalCenter)
class MedicalCenterAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)

@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ('name', 'reference_number', 'unit', 'min_stock_level')
    search_fields = ('name', 'reference_number')
    list_filter = ('unit',)

@admin.register(MedicineBatch)
class MedicineBatchAdmin(admin.ModelAdmin):
    list_display = ('medicine', 'medical_center', 'expiration_date', 'quantity')
    list_filter = ('medical_center', 'expiration_date')
    search_fields = ('medicine__name', 'medical_center__name')

@admin.register(PharmacyStock)
class PharmacyStockAdmin(admin.ModelAdmin):
    list_display = ('medicine', 'medical_center', 'quantity')
    list_filter = ('medical_center',)
    search_fields = ('medicine__name', 'medical_center__name')

@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ('movement_type', 'medicine', 'medical_center', 'quantity', 'date')
    list_filter = ('movement_type', 'medical_center', 'date')
    search_fields = ('medicine__name', 'medical_center__name')
    date_hierarchy = 'date'
