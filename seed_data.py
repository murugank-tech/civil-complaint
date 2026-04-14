import os
import django
import random

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from users.models import User, NGOProfile, VolunteerProfile
from complaints.models import Complaint

def seed_data():
    print("Seeding database...")
    
    # Create a Superuser
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser('admin', 'admin@example.com', 'admin123', role=User.Role.ADMIN)
        print("Created superuser: admin / admin123")

    # Create Citizens
    citizen1, _ = User.objects.get_or_create(username='citizen1', email='c1@example.com', role=User.Role.CITIZEN)
    citizen1.set_password('pass123')
    citizen1.save()
    
    citizen2, _ = User.objects.get_or_create(username='citizen2', email='c2@example.com', role=User.Role.CITIZEN)
    citizen2.set_password('pass123')
    citizen2.save()

    # Create NGO
    ngo_user, _ = User.objects.get_or_create(username='green_ngo', email='ngo@green.org', role=User.Role.NGO)
    ngo_user.set_password('pass123')
    ngo_user.save()
    ngo_profile, _ = NGOProfile.objects.get_or_create(
        user=ngo_user, 
        name="Green City NGO", 
        description="Focused on environmental and infrastructure issues.",
        is_verified=True
    )

    # Create Volunteer
    volunteer_user, _ = User.objects.get_or_create(username='volunteer1', email='v1@example.com', role=User.Role.VOLUNTEER)
    volunteer_user.set_password('pass123')
    volunteer_user.save()
    VolunteerProfile.objects.get_or_create(
        user=volunteer_user,
        ngo=ngo_profile
    )

    # Create Complaints
    complaints_data = [
        {
            "citizen": citizen1,
            "title": "Pothole on Main Street",
            "description": "Large pothole in the middle of the road near the library.",
            "category": Complaint.Category.ROADS,
            "location_lat": 51.505,
            "location_lng": -0.09,
            "address": "Main St, Downtown",
            "status": Complaint.Status.PENDING
        },
        {
            "citizen": citizen2,
            "title": "Broken Streetlight",
            "description": "The streetlight at 5th and Oak is flickering and noisy.",
            "category": Complaint.Category.ELECTRICITY,
            "location_lat": 51.515,
            "location_lng": -0.10,
            "address": "5th and Oak, North District",
            "status": Complaint.Status.PENDING
        },
        {
            "citizen": citizen1,
            "title": "Illegal Garbage Dumping",
            "description": "Piles of trash accumulating in the back alleyway.",
            "category": Complaint.Category.WASTE,
            "location_lat": 51.495,
            "location_lng": -0.08,
            "address": "Back Alley, East End",
            "status": Complaint.Status.PENDING
        }
    ]

    for data in complaints_data:
        Complaint.objects.get_or_create(**data)
        print(f"Created complaint: {data['title']}")

    print("Seeding complete.")

if __name__ == '__main__':
    seed_data()
