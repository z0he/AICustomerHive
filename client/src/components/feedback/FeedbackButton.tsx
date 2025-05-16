import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Define form validation schema
const feedbackSchema = z.object({
  feedbackType: z.enum(["suggestion", "bug", "question", "other"], {
    required_error: "Please select a feedback type",
  }),
  message: z.string().min(1, "Feedback message is required").max(1000, "Message cannot exceed 1000 characters"),
  userEmail: z.string().email("Please enter a valid email").optional().or(z.literal("")),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Initialize form
  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      feedbackType: "suggestion",
      message: "",
      userEmail: "",
    },
  });

  // Handle form submission
  const onSubmit = async (data: FeedbackFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/feedback", data);
      
      toast({
        title: "Thank you for your feedback!",
        description: "Your feedback has been submitted successfully.",
        variant: "default",
      });
      
      // Reset form and close dialog
      form.reset();
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      toast({
        title: "Something went wrong",
        description: "Failed to submit your feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating feedback button - positioned higher to avoid overlap with chat assistant */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-6 rounded-full shadow-lg flex items-center gap-2 z-50"
        size="sm"
      >
        <MessageSquare size={16} />
        <span>Feedback</span>
      </Button>

      {/* Feedback dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Send Feedback</DialogTitle>
            <DialogDescription>
              Share your thoughts, report issues, or suggest improvements to help us make the CRM better.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="feedbackType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feedback Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type of feedback" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="suggestion">Suggestion</SelectItem>
                        <SelectItem value="bug">Bug Report</SelectItem>
                        <SelectItem value="question">Question</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Feedback</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Share your thoughts or describe the issue..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="userEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="your@email.com"
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Feedback"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}