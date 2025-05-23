
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, BellRing, Clock, User, MessageSquare, Bot } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { userApi, telegramApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPreferences } from '@/services/types';

const Settings = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<{
    isLinked: boolean;
    username?: string;
    verificationCode?: string;
  }>({
    isLinked: false
  });

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setLoading(true);
        const data = await userApi.getUserPreferences();
        setPreferences(data);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load preferences",
        });
      } finally {
        setLoading(false);
      }
    };

    const fetchTelegramStatus = async () => {
      try {
        const status = await telegramApi.getStatus();
        setTelegramStatus(status);
      } catch (error) {
        console.error('Error fetching Telegram status:', error);
      }
    };

    fetchPreferences();
    fetchTelegramStatus();
  }, [toast]);

  const handleNotificationChange = async (type: keyof UserPreferences['notificationPreferences'], checked: boolean) => {
    if (!preferences) return;
    
    try {
      setLoading(true);
      
      const updatedPreferences = {
        ...preferences,
        notificationPreferences: {
          ...preferences.notificationPreferences,
          [type]: checked
        }
      };
      
      await userApi.updateUserPreferences({
        notificationPreferences: updatedPreferences.notificationPreferences
      });
      
      setPreferences(updatedPreferences);
      
      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been updated."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update preferences",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateVerificationCode = async () => {
    try {
      setLoading(true);
      const result = await telegramApi.generateVerificationCode();
      setTelegramStatus(prev => ({ 
        ...prev, 
        verificationCode: result.verificationCode
      }));
      
      toast({
        title: "Verification code generated",
        description: "Use this code to link your Telegram account.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate verification code",
      });
    } finally {
      setLoading(false);
    }
  };

  const unlinkTelegram = async () => {
    try {
      setLoading(true);
      await telegramApi.unlinkAccount();
      
      setTelegramStatus({
        isLinked: false
      });
      
      // Update preferences
      if (preferences) {
        const updatedPreferences = {
          ...preferences,
          notificationPreferences: {
            ...preferences.notificationPreferences,
            telegram: false
          }
        };
        
        setPreferences(updatedPreferences);
      }
      
      toast({
        title: "Telegram unlinked",
        description: "Your Telegram account has been unlinked.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to unlink Telegram account",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>

        <Tabs defaultValue="account" className="space-y-4">
          <TabsList>
            <TabsTrigger value="account">
              <User className="h-4 w-4 mr-2" />
              Account
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <BellRing className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <Bot className="h-4 w-4 mr-2" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="work-life">
              <Clock className="h-4 w-4 mr-2" />
              Work-Life Balance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  View and update your personal information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    defaultValue={userProfile?.displayName || ""}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    defaultValue={userProfile?.email || ""}
                    disabled
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Choose how you want to receive notifications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="email-notifications" className="flex flex-col space-y-1">
                    <span>Email Notifications</span>
                    <span className="font-normal text-xs text-muted-foreground">
                      Receive notifications via email
                    </span>
                  </Label>
                  <Switch
                    id="email-notifications"
                    checked={preferences?.notificationPreferences?.email || false}
                    onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="desktop-notifications" className="flex flex-col space-y-1">
                    <span>Desktop Notifications</span>
                    <span className="font-normal text-xs text-muted-foreground">
                      Show browser notifications when the app is open
                    </span>
                  </Label>
                  <Switch
                    id="desktop-notifications"
                    checked={preferences?.notificationPreferences?.desktop || false}
                    onCheckedChange={(checked) => handleNotificationChange('desktop', checked)}
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="mobile-notifications" className="flex flex-col space-y-1">
                    <span>Mobile Notifications</span>
                    <span className="font-normal text-xs text-muted-foreground">
                      Receive push notifications on your mobile device
                    </span>
                  </Label>
                  <Switch
                    id="mobile-notifications"
                    checked={preferences?.notificationPreferences?.mobile || false}
                    onCheckedChange={(checked) => handleNotificationChange('mobile', checked)}
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="telegram-notifications" className="flex flex-col space-y-1">
                    <span>Telegram Notifications</span>
                    <span className="font-normal text-xs text-muted-foreground">
                      Receive notifications via Telegram
                    </span>
                  </Label>
                  <Switch
                    id="telegram-notifications"
                    checked={preferences?.notificationPreferences?.telegram || false}
                    onCheckedChange={(checked) => handleNotificationChange('telegram', checked)}
                    disabled={loading || !telegramStatus.isLinked}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle>Telegram Integration</CardTitle>
                <CardDescription>
                  Link your Telegram account to receive notifications and messages.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {telegramStatus.isLinked ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 p-4 rounded-md">
                      <div className="flex items-center">
                        <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                        <p className="text-green-800 dark:text-green-200 font-medium">
                          Your Telegram account is linked
                        </p>
                      </div>
                      {telegramStatus.username && (
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1 pl-7">
                          Username: @{telegramStatus.username}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="destructive" 
                        onClick={unlinkTelegram}
                        disabled={loading}
                      >
                        Unlink Telegram Account
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ol className="list-decimal space-y-2 ml-4">
                      <li>Search for <strong>@FlowSyncBot</strong> on Telegram or <a href="https://t.me/FlowSyncBot" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">click here to open</a>.</li>
                      <li>Start a chat with the bot by sending <strong>/start</strong>.</li>
                      <li>Generate a verification code below and send it to the bot using the <strong>/verify [code]</strong> command.</li>
                    </ol>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button onClick={generateVerificationCode} disabled={loading}>
                          Generate Verification Code
                        </Button>
                      </DialogTrigger>
                      {telegramStatus.verificationCode && (
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Your Verification Code</DialogTitle>
                            <DialogDescription>
                              Send this code to the bot by typing the command below:
                            </DialogDescription>
                          </DialogHeader>
                          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-md">
                            <p className="font-mono text-lg text-center">
                              /verify {telegramStatus.verificationCode}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            This code is valid for 15 minutes. After successful verification, you will be
                            able to receive notifications via Telegram.
                          </p>
                          <DialogFooter>
                            <Button onClick={() => navigator.clipboard.writeText(`/verify ${telegramStatus.verificationCode}`)} variant="secondary">
                              Copy Command
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      )}
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="work-life">
            <Card>
              <CardHeader>
                <CardTitle>Work-Life Balance Settings</CardTitle>
                <CardDescription>
                  Configure your work hours and message priority settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Work-Life Balance settings coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;
