from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ComplaintViewSet, TaskViewSet, NGOProfileViewSet
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

router = DefaultRouter()
router.register(r'complaints', ComplaintViewSet)
router.register(r'tasks', TaskViewSet)
router.register(r'ngos', NGOProfileViewSet)

urlpatterns = [
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', include(router.urls)),
]
