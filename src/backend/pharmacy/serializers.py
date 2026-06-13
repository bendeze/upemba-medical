from rest_framework import serializers
from .models import Medicine, StockMovement, PharmacyStock, MedicineBatch, GlobalSettings, MedicalCenter

class MedicalCenterSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalCenter
        fields = ['id', 'name', 'created_at', 'updated_at']

class GlobalSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalSettings
        fields = ['id', 'general_min_stock_level', 'updated_at']

class MedicineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medicine
        fields = ['id', 'name', 'reference_number', 'unit', 'min_stock_level', 'created_at']

class MedicineBatchSerializer(serializers.ModelSerializer):
    medicine = MedicineSerializer(read_only=True)
    medical_center = MedicalCenterSerializer(read_only=True)

    class Meta:
        model = MedicineBatch
        fields = ['id', 'medicine', 'medical_center', 'expiration_date', 'quantity']

class PharmacyStockSerializer(serializers.ModelSerializer):
    medicine = MedicineSerializer(read_only=True)
    medical_center = MedicalCenterSerializer(read_only=True)
    
    # We can also compute the overall minimum stock level
    min_stock_level = serializers.SerializerMethodField()

    class Meta:
        model = PharmacyStock
        fields = ['id', 'medicine', 'medical_center', 'quantity', 'min_stock_level']
        
    def get_min_stock_level(self, obj):
        if obj.medicine.min_stock_level is not None:
            return obj.medicine.min_stock_level
        settings = GlobalSettings.load()
        return settings.general_min_stock_level

class StockMovementSerializer(serializers.ModelSerializer):
    medicine = MedicineSerializer(read_only=True)
    medicine_id = serializers.UUIDField(write_only=True)
    medical_center = MedicalCenterSerializer(read_only=True)
    medical_center_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = StockMovement
        fields = ['id', 'medicine', 'medicine_id', 'medical_center', 'medical_center_id', 'movement_type', 'quantity', 'expiration_date', 'date', 'notes', 'created_at']
        
    def create(self, validated_data):
        return StockMovement.objects.create(**validated_data)
