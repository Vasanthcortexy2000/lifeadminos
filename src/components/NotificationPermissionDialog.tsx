 import { Bell } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 
 interface NotificationPermissionDialogProps {
   open: boolean;
   onEnable: () => void;
   onDecline: () => void;
 }
 
 export function NotificationPermissionDialog({
   open,
   onEnable,
   onDecline,
 }: NotificationPermissionDialogProps) {
   return (
     <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDecline()}>
       <DialogContent className="sm:max-w-sm">
         <DialogHeader className="text-center sm:text-center">
           <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
             <Bell className="h-6 w-6 text-primary" />
           </div>
           <DialogTitle className="text-xl">Stay on top of deadlines</DialogTitle>
           <DialogDescription className="text-base pt-2">
             Get a gentle nudge when something important is coming up — even when you're not using the app.
           </DialogDescription>
         </DialogHeader>
 
         <div className="flex flex-col gap-3 pt-4">
           <Button onClick={onEnable} className="w-full">
             Enable notifications
           </Button>
           <Button variant="ghost" onClick={onDecline} className="w-full text-muted-foreground">
             Maybe later
           </Button>
         </div>
       </DialogContent>
     </Dialog>
   );
 }