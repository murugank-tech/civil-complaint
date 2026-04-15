from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.response import Response
from users.models import User, NGOProfile, VolunteerProfile
from complaints.models import Complaint, Task
from .serializers import (
    UserSerializer, NGOProfileSerializer, VolunteerProfileSerializer,
    ComplaintSerializer, TaskSerializer
)

class ComplaintViewSet(viewsets.ModelViewSet):
    queryset = Complaint.objects.all().order_by('-created_at')
    serializer_class = ComplaintSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(citizen=self.request.user)
        
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def resolve_admin(self, request, pk=None):
        complaint = self.get_object()
        if request.user.role != User.Role.ADMIN and not request.user.is_superuser:
            return Response({'error': 'Only admins can resolve directly.'}, status=status.HTTP_403_FORBIDDEN)
        complaint.status = Complaint.Status.RESOLVED
        complaint.save()
        return Response({'status': 'Complaint resolved by admin'})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def read_admin(self, request, pk=None):
        complaint = self.get_object()
        if request.user.role != User.Role.ADMIN and not request.user.is_superuser:
            return Response({'error': 'Only admins can mark read directly.'}, status=status.HTTP_403_FORBIDDEN)
        if complaint.status == Complaint.Status.PENDING:
            complaint.status = Complaint.Status.ACCEPTED # 'ACCEPTED' used as 'Read/Acknowledged'
            complaint.save()
        return Response({'status': 'Complaint marked as read by admin'})
        
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def accept_complaint(self, request, pk=None):
        complaint = self.get_object()
        # Assume request user is an NGO
        if request.user.role != User.Role.NGO:
            return Response({'error': 'Only NGOs can accept complaints.'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            ngo_profile = request.user.ngo_profile
            complaint.assigned_ngo = ngo_profile
            complaint.status = Complaint.Status.ACCEPTED
            complaint.save()
            return Response({'status': 'Complaint accepted'})
        except NGOProfile.DoesNotExist:
            return Response({'error': 'NGO profile missing.'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def assign_volunteer(self, request, pk=None):
        complaint = self.get_object()
        volunteer_id = request.data.get('volunteer_id')
        try:
            volunteer = VolunteerProfile.objects.get(id=volunteer_id)
        except VolunteerProfile.DoesNotExist:
            return Response({'error': 'Volunteer not found.'}, status=status.HTTP_404_NOT_FOUND)
            
        task, created = Task.objects.get_or_create(complaint=complaint)
        task.volunteer = volunteer
        task.status = Task.Status.NOT_STARTED
        task.save()
        
        complaint.status = Complaint.Status.ASSIGNED
        complaint.save()
        
        return Response({'status': 'Volunteer assigned', 'task_id': task.id})

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all().order_by('-created_at')
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        task = self.get_object()
        if request.user.role != User.Role.VOLUNTEER or task.volunteer.user != request.user:
            return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)
            
        task.status = Task.Status.COMPLETED
        if 'resolution_proof' in request.FILES:
            task.resolution_proof = request.FILES['resolution_proof']
        task.resolution_notes = request.data.get('resolution_notes', '')
        task.save()
        
        # update complaint status
        complaint = task.complaint
        complaint.status = Complaint.Status.RESOLVED
        complaint.save()
        
        # assign points to volunteer
        volunteer = task.volunteer
        volunteer.points += 10
        volunteer.save()
        
        # update NGO impact
        ngo = volunteer.ngo
        if ngo:
            ngo.impact_people_helped += 5 # Mock metric
            ngo.impact_issues_resolved += 1
            ngo.save()
            
        return Response({'status': 'Task marked as completed'})

class NGOProfileViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = NGOProfile.objects.filter(is_verified=True)
    serializer_class = NGOProfileSerializer

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        if not username or not password:
            return Response({'error': 'Username and password required'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.create_user(username=username, password=password, role=User.Role.CITIZEN)
        return Response({'status': 'User created'}, status=status.HTTP_201_CREATED)

class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
