from rest_framework import serializers
from users.models import User, NGOProfile, VolunteerProfile
from complaints.models import Complaint, Task

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'first_name', 'last_name')


class NGOProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = NGOProfile
        fields = '__all__'


class VolunteerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    ngo = NGOProfileSerializer(read_only=True)
    
    class Meta:
        model = VolunteerProfile
        fields = '__all__'


class ComplaintSerializer(serializers.ModelSerializer):
    citizen = UserSerializer(read_only=True)
    assigned_ngo = NGOProfileSerializer(read_only=True)
    
    class Meta:
        model = Complaint
        fields = '__all__'
        read_only_fields = ('status', 'assigned_ngo', 'created_at', 'updated_at')


class TaskSerializer(serializers.ModelSerializer):
    complaint = ComplaintSerializer(read_only=True)
    volunteer = VolunteerProfileSerializer(read_only=True)
    
    class Meta:
        model = Task
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
