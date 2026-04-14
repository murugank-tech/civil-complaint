from django.db import models
from django.conf import settings
from users.models import NGOProfile, VolunteerProfile

class Complaint(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ACCEPTED = 'ACCEPTED', 'Accepted' # NGO Accepted
        ASSIGNED = 'ASSIGNED', 'Assigned' # Assigned to Volunteer
        RESOLVED = 'RESOLVED', 'Resolved'
        REJECTED = 'REJECTED', 'Rejected'
        
    class Category(models.TextChoices):
        ROADS = 'ROADS', 'Roads & Infrastructure'
        WATER = 'WATER', 'Water & Sanitation'
        WASTE = 'WASTE', 'Waste Management'
        ELECTRICITY = 'ELECTRICITY', 'Electricity'
        OTHER = 'OTHER', 'Other'

    citizen = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='complaints_made')
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=Category.choices, default=Category.OTHER)
    location_lat = models.FloatField()
    location_lng = models.FloatField()
    address = models.CharField(max_length=500, blank=True)
    
    media_proof = models.ImageField(upload_to='complaints/', null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    assigned_ngo = models.ForeignKey(NGOProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='complaints')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.title} - {self.status}"

class Task(models.Model):
    class Status(models.TextChoices):
        NOT_STARTED = 'NOT_STARTED', 'Not Started'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'
        
    complaint = models.OneToOneField(Complaint, on_delete=models.CASCADE, related_name='task')
    volunteer = models.ForeignKey(VolunteerProfile, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NOT_STARTED)
    
    resolution_proof = models.ImageField(upload_to='resolutions/', null=True, blank=True)
    resolution_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Task for {self.complaint.title} - {self.status}"
