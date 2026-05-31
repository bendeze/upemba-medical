"""
URL configuration for umis_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.views.static import serve
from django.conf import settings
import os
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from core.views import IndexView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # JWT Authentication Endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # API Version 1 Endpoints
    path('api/v1/', include('beneficiaries.urls')),
    
    # Serve pre-compiled static Next.js frontend assets (for offline wheel distribution)
    path('_next/<path:path>', serve, {'document_root': os.path.join(settings.BASE_DIR, 'static', '_next')}),
    path('favicon.ico', serve, {'document_root': os.path.join(settings.BASE_DIR, 'static'), 'path': 'favicon.ico'}),
    path('file.svg', serve, {'document_root': os.path.join(settings.BASE_DIR, 'static'), 'path': 'file.svg'}),
    path('globe.svg', serve, {'document_root': os.path.join(settings.BASE_DIR, 'static'), 'path': 'globe.svg'}),
    path('next.svg', serve, {'document_root': os.path.join(settings.BASE_DIR, 'static'), 'path': 'next.svg'}),
    path('vercel.svg', serve, {'document_root': os.path.join(settings.BASE_DIR, 'static'), 'path': 'vercel.svg'}),
    path('window.svg', serve, {'document_root': os.path.join(settings.BASE_DIR, 'static'), 'path': 'window.svg'}),
    
    # Serve pre-compiled static Next.js frontend home page
    path('', IndexView.as_view(), name='index'),
]

