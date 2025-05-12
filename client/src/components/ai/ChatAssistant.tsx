import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Bot, Send, MoreHorizontal, Clock, ChevronRight, Plus } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

// Types for the chat components
interface ChatMessage {
  id: number;
  conversationId: number;
  content: string;
  role: 'user' | 'assistant';
  createdAt: string;
  metadata?: {
    suggestedActions?: {
      label: string;
      action: string;
    }[];
  };
}

interface ChatConversation {
  id: number;
  userId: number;
  title: string;
  context?: Record<string, any>;
  createdAt: string;
  lastMessageAt?: string;
}

interface ChatResponse {
  response: string;
  suggestedActions?: {
    label: string;
    action: string;
  }[];
  conversationId: number;
}

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [showConversations, setShowConversations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all user conversations
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: ['/api/ai/assistant/conversations'],
    enabled: isOpen && showConversations,
    queryFn: async () => {
      const response = await fetch('/api/ai/assistant/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      return response.json();
    }
  });

  // Get messages for the current conversation
  const { data: currentConversation, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['/api/ai/assistant/conversations', currentConversationId],
    enabled: !!currentConversationId && isOpen,
    queryFn: async () => {
      const response = await fetch(`/api/ai/assistant/conversations/${currentConversationId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }
      return response.json();
    }
  });

  // Send a message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; conversationId?: number }) => {
      const response = await apiRequest('/api/ai/assistant/chat', 'POST', data);
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      return response.json();
    },
    onSuccess: (data: ChatResponse) => {
      // Update the current conversation ID if it's a new conversation
      setCurrentConversationId(data.conversationId);
      
      // Clear the message input
      setMessage('');
      
      // Invalidate queries to refresh conversations and messages
      queryClient.invalidateQueries({ queryKey: ['/api/ai/assistant/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/assistant/conversations', data.conversationId] });
    },
    onError: (error) => {
      toast({
        title: 'Error sending message',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentConversation]);

  // Handle sending a message
  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    sendMessageMutation.mutate({
      message: message.trim(),
      conversationId: currentConversationId || undefined,
    });
  };

  // Handle key press in message input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle clicking a suggested action
  const handleSuggestedAction = (action: string) => {
    // For now, just show what action would be taken
    toast({
      title: 'Action',
      description: `Executing: ${action}`,
    });
    
    // In a real implementation, you would handle the action based on the action type
    // such as navigation, opening a modal, etc.
  };

  // Start a new conversation
  const startNewConversation = () => {
    setCurrentConversationId(null);
    setShowConversations(false);
  };

  // Select a conversation
  const selectConversation = (conversationId: number) => {
    setCurrentConversationId(conversationId);
    setShowConversations(false);
  };

  return (
    <>
      {/* Floating Action Button in the corner */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 rounded-full w-12 h-12 p-0 shadow-lg hover:shadow-xl transition-all duration-300"
        data-chat-assistant-trigger
      >
        <Bot className="h-6 w-6" />
      </Button>

      {/* Dialog for chat assistant */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] h-[600px] max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                CRM Assistant
              </DialogTitle>
              
              <div className="flex items-center gap-2">
                {currentConversationId && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setShowConversations(!showConversations)}
                    className="h-8 w-8"
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                )}
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={startNewConversation}
                  className="h-8 w-8"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogDescription>
              Ask me anything about using the CRM system
            </DialogDescription>
          </DialogHeader>

          {/* Conversation history sidebar */}
          {showConversations && (
            <div className="absolute left-0 top-[72px] bottom-0 w-64 bg-background border-r shadow-lg z-10">
              <div className="p-3 border-b">
                <h3 className="font-medium">Recent Conversations</h3>
              </div>
              
              <ScrollArea className="h-[calc(100%-49px)]">
                {isLoadingConversations ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <div className="py-2">
                    {conversations?.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center p-4">
                        No conversations yet
                      </p>
                    ) : (
                      conversations?.map((conversation: ChatConversation) => (
                        <div 
                          key={conversation.id}
                          onClick={() => selectConversation(conversation.id)}
                          className={`px-3 py-2 hover:bg-muted cursor-pointer flex items-center justify-between ${
                            conversation.id === currentConversationId ? 'bg-muted' : ''
                          }`}
                        >
                          <div className="truncate">
                            <div className="font-medium truncate">{conversation.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(conversation.createdAt), { addSuffix: true })}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {/* Chat messages area */}
          <ScrollArea className="flex-1 p-4">
            {currentConversationId ? (
              isLoadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {currentConversation && currentConversation.messages && currentConversation.messages.map((message: ChatMessage) => (
                    <div 
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] px-4 py-3 rounded-lg ${
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        
                        {/* Suggested actions */}
                        {message.role === 'assistant' && 
                         message.metadata && 
                         message.metadata.suggestedActions && 
                         message.metadata.suggestedActions.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-muted-foreground/20 space-y-2">
                            {message.metadata.suggestedActions.map((action, index) => (
                              <Button 
                                key={index}
                                variant="secondary"
                                size="sm"
                                className="mr-2 text-xs"
                                onClick={() => handleSuggestedAction(action.action)}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center space-y-4 px-4">
                <Bot className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-xl font-semibold">How can I help you today?</h3>
                <p className="text-center text-muted-foreground">
                  Ask me about using the CRM, managing leads, creating campaigns, or any other CRM-related tasks.
                </p>
                <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-4">
                  {[
                    "How do I create a campaign?",
                    "What are the best practices for lead scoring?",
                    "How can I track email performance?",
                    "What analytics should I focus on?"
                  ].map((suggestion, i) => (
                    <Button 
                      key={i} 
                      variant="outline"
                      onClick={() => {
                        setMessage(suggestion);
                        setTimeout(() => handleSendMessage(), 100);
                      }}
                      className="justify-start h-auto py-3 px-4 text-left"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Message input area */}
          <div className="p-4 border-t mt-auto">
            <div className="flex items-end gap-2">
              <Textarea
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-1 min-h-[60px] max-h-[120px]"
                disabled={sendMessageMutation.isPending}
              />
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={!message.trim() || sendMessageMutation.isPending}
                className="h-10 w-10"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ChatAssistant;