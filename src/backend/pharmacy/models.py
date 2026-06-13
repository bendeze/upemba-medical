import uuid
from django.db import models
from core.models import TimeStampedModel, SoftDeleteModel
from django.utils import timezone
class MedicalCenter(TimeStampedModel):
    """Healthcare facility managed by the pharmacy module."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class GlobalSettings(TimeStampedModel):
    """Stores system-wide settings, ensuring only one row exists."""
    general_min_stock_level = models.IntegerField(default=10)
    
    def save(self, *args, **kwargs):
        self.pk = 1
        super(GlobalSettings, self).save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

class Medicine(TimeStampedModel, SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    reference_number = models.CharField(max_length=100, null=True, blank=True)
    unit = models.CharField(max_length=50) # e.g., tablet, bottle, box
    min_stock_level = models.IntegerField(null=True, blank=True, help_text="Overrides general minimum stock level if set")
    
    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.unit})"

class MedicineBatch(TimeStampedModel):
    """Tracks specific batches of medicine with expiration dates."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    medical_center = models.ForeignKey(MedicalCenter, on_delete=models.CASCADE, related_name='medicine_batches', null=True, blank=True)
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name='batches')
    expiration_date = models.DateField(null=True, blank=True)
    quantity = models.IntegerField(default=0) # Current remaining in this batch
    
    class Meta:
        unique_together = ('medical_center', 'medicine', 'expiration_date')

    def __str__(self):
        return f"{self.medicine.name} at {self.medical_center.name} exp {self.expiration_date}: {self.quantity}"

class PharmacyStock(TimeStampedModel):
    """Aggregated current stock for a medicine at a specific site."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    medical_center = models.ForeignKey(MedicalCenter, on_delete=models.CASCADE, related_name='pharmacy_stocks', null=True, blank=True)
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name='site_stocks')
    quantity = models.IntegerField(default=0)

    class Meta:
        unique_together = ('medical_center', 'medicine')

    def __str__(self):
        return f"{self.medicine.name} at {self.medical_center.name}: {self.quantity}"

class StockMovement(TimeStampedModel):
    MOVEMENT_TYPES = [
        ('IN', 'Entrance'),
        ('OUT', 'Exit'),
        ('HISTORICAL_OUT', 'Historical Exit'),
        ('ADJUST', 'Adjustment'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    medical_center = models.ForeignKey(MedicalCenter, on_delete=models.CASCADE, related_name='stock_movements', null=True, blank=True)
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE, related_name='movements')
    movement_type = models.CharField(max_length=14, choices=MOVEMENT_TYPES)
    quantity = models.IntegerField() # always positive, movement_type determines add/subtract
    expiration_date = models.DateField(null=True, blank=True)
    date = models.DateField(default=timezone.now)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.movement_type} - {self.medicine.name} at {self.medical_center.name} ({self.quantity})"
