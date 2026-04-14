from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        CITIZEN = 'CITIZEN', 'Citizen'
        NGO = 'NGO', 'NGO'
        VOLUNTEER = 'VOLUNTEER', 'Volunteer'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CITIZEN)

    def __str__(self):
        return f"{self.username} ({self.role})"

class NGOProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='ngo_profile')
    name = models.CharField(max_length=255)
    description = models.TextField()
    is_verified = models.BooleanField(default=False)
    # Could link to specific categories: focus_areas
    location_lat = models.FloatField(null=True, blank=True)
    location_lng = models.FloatField(null=True, blank=True)
    radius_km = models.IntegerField(default=10)
    impact_people_helped = models.IntegerField(default=0)
    impact_issues_resolved = models.IntegerField(default=0)
    
    def __str__(self):
        return self.name

class VolunteerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='volunteer_profile')
    ngo = models.ForeignKey(NGOProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='volunteers')
    points = models.IntegerField(default=0)
    
    def __str__(self):
        return self.user.username
