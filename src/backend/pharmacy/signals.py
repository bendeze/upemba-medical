from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import F
from .models import StockMovement, PharmacyStock, MedicineBatch

@receiver(post_save, sender=StockMovement)
def update_stock_on_movement(sender, instance, created, **kwargs):
    if not created:
        return
        
    if instance.movement_type == 'HISTORICAL_OUT':
        return
    
    # 1. Update overall PharmacyStock
    stock, _ = PharmacyStock.objects.get_or_create(
        medical_center=instance.medical_center,
        medicine=instance.medicine,
        defaults={'quantity': 0}
    )

    if instance.movement_type == 'IN':
        stock.quantity += instance.quantity
        stock.save()

        # Update or create MedicineBatch if expiration date is provided
        if instance.expiration_date:
            batch, _ = MedicineBatch.objects.get_or_create(
                medical_center=instance.medical_center,
                medicine=instance.medicine,
                expiration_date=instance.expiration_date,
                defaults={'quantity': 0}
            )
            batch.quantity += instance.quantity
            batch.save()
            
    elif instance.movement_type in ['OUT', 'ADJUST']:
        # If adjust and it's a negative adjustment (simulated by OUT)
        stock.quantity -= instance.quantity
        stock.save()

        # FIFO deduction from batches
        remaining_to_deduct = instance.quantity
        batches = MedicineBatch.objects.filter(
            medical_center=instance.medical_center, 
            medicine=instance.medicine, 
            quantity__gt=0
        ).order_by('expiration_date') # earliest expiring first

        for batch in batches:
            if remaining_to_deduct <= 0:
                break
            
            if batch.quantity >= remaining_to_deduct:
                batch.quantity -= remaining_to_deduct
                batch.save()
                remaining_to_deduct = 0
            else:
                remaining_to_deduct -= batch.quantity
                batch.quantity = 0
                batch.save()
