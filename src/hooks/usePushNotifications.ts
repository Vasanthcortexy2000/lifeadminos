 import { useState, useEffect, useCallback } from 'react';
 import { Capacitor } from '@capacitor/core';
 import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 
 interface PushNotificationState {
   isSupported: boolean;
   isRegistered: boolean;
   permissionAsked: boolean;
   pushEnabled: boolean;
   loading: boolean;
 }
 
 export function usePushNotifications() {
   const { user } = useAuth();
   const [state, setState] = useState<PushNotificationState>({
     isSupported: false,
     isRegistered: false,
     permissionAsked: false,
     pushEnabled: false,
     loading: true,
   });
 
   const isNativePlatform = Capacitor.isNativePlatform();
 
   // Fetch current push preferences from profile
   useEffect(() => {
     if (!user) {
       setState(prev => ({ ...prev, loading: false }));
       return;
     }
 
     const fetchPreferences = async () => {
       const { data, error } = await supabase
         .from('profiles')
         .select('push_enabled, push_token, push_permission_asked')
         .eq('user_id', user.id)
         .maybeSingle();
 
       if (!error && data) {
         setState(prev => ({
           ...prev,
           isSupported: isNativePlatform,
           isRegistered: !!data.push_token,
           permissionAsked: data.push_permission_asked ?? false,
           pushEnabled: data.push_enabled ?? false,
           loading: false,
         }));
       } else {
         setState(prev => ({
           ...prev,
           isSupported: isNativePlatform,
           loading: false,
         }));
       }
     };
 
     fetchPreferences();
   }, [user, isNativePlatform]);
 
   // Set up push notification listeners
   useEffect(() => {
     if (!isNativePlatform) return;
 
     // On successful registration, save token
     const registrationListener = PushNotifications.addListener('registration', async (token: Token) => {
       console.log('Push registration success, token:', token.value);
       
       if (user) {
         await supabase
           .from('profiles')
           .update({
             push_token: token.value,
             push_enabled: true,
             push_permission_asked: true,
           })
           .eq('user_id', user.id);
 
         setState(prev => ({
           ...prev,
           isRegistered: true,
           pushEnabled: true,
           permissionAsked: true,
         }));
       }
     });
 
     // On registration error
     const errorListener = PushNotifications.addListener('registrationError', async (error) => {
       console.error('Push registration error:', error);
       
       if (user) {
         await supabase
           .from('profiles')
           .update({
             push_permission_asked: true,
             push_enabled: false,
           })
           .eq('user_id', user.id);
 
         setState(prev => ({
           ...prev,
           permissionAsked: true,
           pushEnabled: false,
         }));
       }
     });
 
     // Handle notification received while app is in foreground
     const notificationListener = PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
       console.log('Push notification received:', notification);
     });
 
     // Handle notification action (user tapped notification)
     const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
       console.log('Push notification action:', action);
     });
 
     return () => {
       registrationListener.then(l => l.remove());
       errorListener.then(l => l.remove());
       notificationListener.then(l => l.remove());
       actionListener.then(l => l.remove());
     };
   }, [user, isNativePlatform]);
 
   // Request permission and register
   const requestPermission = useCallback(async (): Promise<boolean> => {
     if (!isNativePlatform) {
       console.log('Push notifications not supported on web');
       return false;
     }
 
     try {
       // Check current permission status
       let permStatus = await PushNotifications.checkPermissions();
 
       if (permStatus.receive === 'prompt') {
         permStatus = await PushNotifications.requestPermissions();
       }
 
       if (permStatus.receive === 'granted') {
         await PushNotifications.register();
         return true;
       } else {
         // Permission denied - save that we asked
         if (user) {
           await supabase
             .from('profiles')
             .update({
               push_permission_asked: true,
               push_enabled: false,
             })
             .eq('user_id', user.id);
         }
         setState(prev => ({ ...prev, permissionAsked: true, pushEnabled: false }));
         return false;
       }
     } catch (error) {
       console.error('Error requesting push permission:', error);
       return false;
     }
   }, [user, isNativePlatform]);
 
   // Decline permission (user chose "Maybe later")
   const declinePermission = useCallback(async () => {
     if (user) {
       await supabase
         .from('profiles')
         .update({ push_permission_asked: true })
         .eq('user_id', user.id);
     }
     setState(prev => ({ ...prev, permissionAsked: true }));
   }, [user]);
 
   // Toggle push notifications on/off
   const togglePush = useCallback(async (enabled: boolean) => {
     if (!user) return;
 
     if (enabled && !state.isRegistered) {
       // Need to register first
       await requestPermission();
     } else {
       // Just update the preference
       await supabase
         .from('profiles')
         .update({ push_enabled: enabled })
         .eq('user_id', user.id);
 
       setState(prev => ({ ...prev, pushEnabled: enabled }));
     }
   }, [user, state.isRegistered, requestPermission]);
 
   return {
     ...state,
     requestPermission,
     declinePermission,
     togglePush,
     shouldShowPermissionDialog: !state.loading && !state.permissionAsked && state.isSupported,
   };
 }