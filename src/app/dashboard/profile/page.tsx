"use client";

import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserProfile, UserProfileFormData } from "@/types/user-profile-types";
import { cn } from "@/utils/cn";
import { 
  User, 
  Camera, 
  Save, 
  X, 
  Plus, 
  Globe, 
  MapPin, 
  Building, 
  Briefcase,
  Twitter,
  Linkedin,
  Github,
  MessageSquare,
  Bell,
  Shield,
  Palette,
  Languages,
  Clock
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [newSkill, setNewSkill] = useState("");
  const [formData, setFormData] = useState<UserProfileFormData>({
    full_name: "",
    display_name: "",
    bio: "",
    location: "",
    website: "",
    company: "",
    job_title: "",
    skills: [],
    social_links: {
      twitter: "",
      linkedin: "",
      github: "",
      discord: "",
    },
    preferences: {
      theme: "dark",
      language: "en",
      timezone: "UTC",
      notifications: {
        email_comments: true,
        email_mentions: true,
        email_reactions: false,
        push_comments: true,
        push_mentions: true,
        push_reactions: false,
      },
      privacy: {
        show_email: false,
        show_location: true,
        show_company: true,
        profile_visibility: "public",
      },
    },
  });

  // Load user profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement API call to load user profile
      // const response = await fetch('/api/profile');
      // const profileData = await response.json();
      // setProfile(profileData);
      // setFormData(transformProfileToFormData(profileData));
      
      // Mock data for now
      const mockProfile: UserProfile = {
        id: "1",
        user_id: "user-1",
        full_name: "John Doe",
        display_name: "johndoe",
        avatar_url: null,
        bio: "Software engineer passionate about mind mapping and visualization",
        location: "San Francisco, CA",
        website: "https://johndoe.dev",
        company: "Tech Corp",
        job_title: "Senior Developer",
        skills: ["React", "TypeScript", "Node.js", "PostgreSQL"],
        social_links: {
          twitter: "johndoe",
          linkedin: "johndoe",
          github: "johndoe",
          discord: "johndoe#1234",
        },
        preferences: {
          theme: "dark",
          language: "en",
          timezone: "America/Los_Angeles",
          notifications: {
            email_comments: true,
            email_mentions: true,
            email_reactions: false,
            push_comments: true,
            push_mentions: true,
            push_reactions: false,
          },
          privacy: {
            show_email: false,
            show_location: true,
            show_company: true,
            profile_visibility: "public",
          },
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      setProfile(mockProfile);
      setFormData({
        full_name: mockProfile.full_name,
        display_name: mockProfile.display_name || "",
        bio: mockProfile.bio || "",
        location: mockProfile.location || "",
        website: mockProfile.website || "",
        company: mockProfile.company || "",
        job_title: mockProfile.job_title || "",
        skills: mockProfile.skills || [],
        social_links: {
          twitter: mockProfile.social_links?.twitter || "",
          linkedin: mockProfile.social_links?.linkedin || "",
          github: mockProfile.social_links?.github || "",
          discord: mockProfile.social_links?.discord || "",
        },
        preferences: mockProfile.preferences || formData.preferences,
      });
    } catch (error) {
      console.error("Failed to load profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement API call to save profile
      // const response = await fetch('/api/profile', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData),
      // });
      
      // Mock save for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = useCallback(async (file: File) => {
    try {
      // TODO: Implement avatar upload
      // const formData = new FormData();
      // formData.append('avatar', file);
      // const response = await fetch('/api/profile/avatar', {
      //   method: 'POST',
      //   body: formData,
      // });
      
      toast.success("Avatar uploaded successfully!");
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      toast.error("Failed to upload avatar");
    }
  }, []);

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateNestedFormData = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof UserProfileFormData],
        [field]: value
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
          <p className="text-zinc-400 mt-1">Manage your account settings and preferences</p>
        </div>
        
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Save className="size-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-zinc-900">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="size-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-2">
            <Globe className="size-4" />
            Social
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="size-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="size-4" />
            Privacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Avatar Section */}
          <Card className="bg-zinc-900 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white">Profile Picture</CardTitle>
              <CardDescription>Update your profile picture</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <UserAvatar user={profile} size="2xl" />
              <div className="space-y-2">
                <Button variant="outline" className="relative">
                  <Camera className="size-4 mr-2" />
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAvatarUpload(file);
                    }}
                  />
                </Button>
                <p className="text-xs text-zinc-500">
                  JPG, PNG or GIF. Max size 2MB.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card className="bg-zinc-900 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white">Basic Information</CardTitle>
              <CardDescription>Your public profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => updateFormData("full_name", e.target.value)}
                    className="bg-zinc-800 border-zinc-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => updateFormData("display_name", e.target.value)}
                    className="bg-zinc-800 border-zinc-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => updateFormData("bio", e.target.value)}
                  className="bg-zinc-800 border-zinc-600"
                  rows={3}
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">
                    <MapPin className="size-4 inline mr-1" />
                    Location
                  </Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => updateFormData("location", e.target.value)}
                    className="bg-zinc-800 border-zinc-600"
                    placeholder="City, Country"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">
                    <Globe className="size-4 inline mr-1" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => updateFormData("website", e.target.value)}
                    className="bg-zinc-800 border-zinc-600"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">
                    <Building className="size-4 inline mr-1" />
                    Company
                  </Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => updateFormData("company", e.target.value)}
                    className="bg-zinc-800 border-zinc-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job_title">
                    <Briefcase className="size-4 inline mr-1" />
                    Job Title
                  </Label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) => updateFormData("job_title", e.target.value)}
                    className="bg-zinc-800 border-zinc-600"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills Section */}
          <Card className="bg-zinc-900 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white">Skills</CardTitle>
              <CardDescription>Add your skills and expertise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addSkill()}
                  placeholder="Add a skill..."
                  className="bg-zinc-800 border-zinc-600"
                />
                <Button onClick={addSkill} size="sm">
                  <Plus className="size-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="bg-teal-900 text-teal-200 hover:bg-teal-800"
                  >
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      className="ml-1 hover:text-red-400"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white">Social Links</CardTitle>
              <CardDescription>Connect your social media accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="twitter">
                  <Twitter className="size-4 inline mr-2" />
                  Twitter
                </Label>
                <Input
                  id="twitter"
                  value={formData.social_links.twitter}
                  onChange={(e) => updateNestedFormData("social_links", "twitter", e.target.value)}
                  className="bg-zinc-800 border-zinc-600"
                  placeholder="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin">
                  <Linkedin className="size-4 inline mr-2" />
                  LinkedIn
                </Label>
                <Input
                  id="linkedin"
                  value={formData.social_links.linkedin}
                  onChange={(e) => updateNestedFormData("social_links", "linkedin", e.target.value)}
                  className="bg-zinc-800 border-zinc-600"
                  placeholder="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="github">
                  <Github className="size-4 inline mr-2" />
                  GitHub
                </Label>
                <Input
                  id="github"
                  value={formData.social_links.github}
                  onChange={(e) => updateNestedFormData("social_links", "github", e.target.value)}
                  className="bg-zinc-800 border-zinc-600"
                  placeholder="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discord">
                  <MessageSquare className="size-4 inline mr-2" />
                  Discord
                </Label>
                <Input
                  id="discord"
                  value={formData.social_links.discord}
                  onChange={(e) => updateNestedFormData("social_links", "discord", e.target.value)}
                  className="bg-zinc-800 border-zinc-600"
                  placeholder="username#1234"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white">Email Notifications</CardTitle>
              <CardDescription>Configure when you receive email notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Comment notifications</Label>
                  <p className="text-sm text-zinc-400">Get notified when someone comments on your content</p>
                </div>
                <Switch
                  checked={formData.preferences.notifications.email_comments}
                  onCheckedChange={(checked) => 
                    updateNestedFormData("preferences", "notifications", {
                      ...formData.preferences.notifications,
                      email_comments: checked
                    })
                  }
                />
              </div>

              <Separator className="bg-zinc-700" />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Mentions</Label>
                  <p className="text-sm text-zinc-400">Get notified when someone mentions you</p>
                </div>
                <Switch
                  checked={formData.preferences.notifications.email_mentions}
                  onCheckedChange={(checked) => 
                    updateNestedFormData("preferences", "notifications", {
                      ...formData.preferences.notifications,
                      email_mentions: checked
                    })
                  }
                />
              </div>

              <Separator className="bg-zinc-700" />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Reactions</Label>
                  <p className="text-sm text-zinc-400">Get notified when someone reacts to your content</p>
                </div>
                <Switch
                  checked={formData.preferences.notifications.email_reactions}
                  onCheckedChange={(checked) => 
                    updateNestedFormData("preferences", "notifications", {
                      ...formData.preferences.notifications,
                      email_reactions: checked
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white">Push Notifications</CardTitle>
              <CardDescription>Configure browser push notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Comment notifications</Label>
                  <p className="text-sm text-zinc-400">Get push notifications for comments</p>
                </div>
                <Switch
                  checked={formData.preferences.notifications.push_comments}
                  onCheckedChange={(checked) => 
                    updateNestedFormData("preferences", "notifications", {
                      ...formData.preferences.notifications,
                      push_comments: checked
                    })
                  }
                />
              </div>

              <Separator className="bg-zinc-700" />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Mentions</Label>
                  <p className="text-sm text-zinc-400">Get push notifications for mentions</p>
                </div>
                <Switch
                  checked={formData.preferences.notifications.push_mentions}
                  onCheckedChange={(checked) => 
                    updateNestedFormData("preferences", "notifications", {
                      ...formData.preferences.notifications,
                      push_mentions: checked
                    })
                  }
                />
              </div>

              <Separator className="bg-zinc-700" />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Reactions</Label>
                  <p className="text-sm text-zinc-400">Get push notifications for reactions</p>
                </div>
                <Switch
                  checked={formData.preferences.notifications.push_reactions}
                  onCheckedChange={(checked) => 
                    updateNestedFormData("preferences", "notifications", {
                      ...formData.preferences.notifications,
                      push_reactions: checked
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white">Profile Visibility</CardTitle>
              <CardDescription>Control who can see your profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Profile visibility</Label>
                <Select
                  value={formData.preferences.privacy.profile_visibility}
                  onValueChange={(value) => 
                    updateNestedFormData("preferences", "privacy", {
                      ...formData.preferences.privacy,
                      profile_visibility: value
                    })
                  }
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public - Anyone can see your profile</SelectItem>
                    <SelectItem value="connections">Connections only</SelectItem>
                    <SelectItem value="private">Private - Only you can see your profile</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-zinc-700" />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show email address</Label>
                  <p className="text-sm text-zinc-400">Display your email on your public profile</p>
                </div>
                <Switch
                  checked={formData.preferences.privacy.show_email}
                  onCheckedChange={(checked) => 
                    updateNestedFormData("preferences", "privacy", {
                      ...formData.preferences.privacy,
                      show_email: checked
                    })
                  }
                />
              </div>

              <Separator className="bg-zinc-700" />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show location</Label>
                  <p className="text-sm text-zinc-400">Display your location on your public profile</p>
                </div>
                <Switch
                  checked={formData.preferences.privacy.show_location}
                  onCheckedChange={(checked) => 
                    updateNestedFormData("preferences", "privacy", {
                      ...formData.preferences.privacy,
                      show_location: checked
                    })
                  }
                />
              </div>

              <Separator className="bg-zinc-700" />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show company</Label>
                  <p className="text-sm text-zinc-400">Display your company information on your public profile</p>
                </div>
                <Switch
                  checked={formData.preferences.privacy.show_company}
                  onCheckedChange={(checked) => 
                    updateNestedFormData("preferences", "privacy", {
                      ...formData.preferences.privacy,
                      show_company: checked
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white">Preferences</CardTitle>
              <CardDescription>Customize your application experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  <Palette className="size-4 inline mr-2" />
                  Theme
                </Label>
                <Select
                  value={formData.preferences.theme}
                  onValueChange={(value) => 
                    updateNestedFormData("preferences", "theme", value)
                  }
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  <Languages className="size-4 inline mr-2" />
                  Language
                </Label>
                <Select
                  value={formData.preferences.language}
                  onValueChange={(value) => 
                    updateNestedFormData("preferences", "language", value)
                  }
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  <Clock className="size-4 inline mr-2" />
                  Timezone
                </Label>
                <Select
                  value={formData.preferences.timezone}
                  onValueChange={(value) => 
                    updateNestedFormData("preferences", "timezone", value)
                  }
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}