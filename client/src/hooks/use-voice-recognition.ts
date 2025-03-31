import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface UseVoiceRecognitionProps {
  onTranscriptFinalized?: (transcript: string) => void;
}

interface InterpretedCommand {
  intent: string;
  action: string;
}

// Add type for SpeechRecognition events
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    [index: number]: {
      isFinal?: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

// Define the SpeechRecognition interface
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (event: Event) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: (event: Event) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
}

export const useVoiceRecognition = ({ onTranscriptFinalized }: UseVoiceRecognitionProps = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interpretedCommand, setInterpretedCommand] = useState<InterpretedCommand | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  
  // Use useRef to maintain the recognition instance across renders
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Initialize speech recognition
  useEffect(() => {
    // Check if browser supports speech recognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        try {
          const current = event.resultIndex;
          const transcript = event.results[current][0].transcript;
          console.log("Speech recognition result:", transcript);
          setTranscript(transcript);
          
          // Check if this is a final result (not interim), and process it if it is
          const result = event.results[current] as any;
          if (result && result.isFinal === true) {
            console.log("Processing final result from onresult:", transcript);
            // Process after a small delay to ensure UI updates
            setTimeout(() => {
              interpretCommand(transcript);
            }, 100);
          }
        } catch (error) {
          console.error("Error processing speech result:", error);
        }
      };
      
      recognition.onend = () => {
        console.log("Speech recognition ended, transcript:", transcript);
        setIsListening(false);
        
        // Capture the current transcript value to a local variable
        const currentTranscript = transcript;
        
        if (currentTranscript && !isProcessing) {
          console.log("Processing final transcript:", currentTranscript);
          
          if (onTranscriptFinalized) {
            onTranscriptFinalized(currentTranscript);
          }
          
          // Small delay to ensure UI updates before processing
          setTimeout(() => {
            interpretCommand(currentTranscript);
          }, 100);
        } else {
          console.log("No transcript to process or already processing");
        }
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        console.error('Speech recognition error', event.error);
        toast({
          title: "Voice Recognition Error",
          description: `Error: ${event.error}. Please try again.`,
          variant: "destructive"
        });
      };
    } else {
      toast({
        title: "Browser Not Supported",
        description: "Your browser doesn't support speech recognition. Please try a different browser.",
        variant: "destructive"
      });
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);
  
  const toggleListening = useCallback(() => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      setTranscript('');
      setInterpretedCommand(null);
      
      // If already listening, don't try to start again
      if (!isListening && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.error('Error starting recognition:', error);
          // Create a new instance if there was an error
          if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.start();
          }
        }
      } else if (!recognitionRef.current) {
        // Create a new instance if needed
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.start();
        }
      }
    }
  }, [isListening]);
  
  const interpretCommand = async (text: string) => {
    if (!text) return;
    
    setIsProcessing(true);
    
    try {
      console.log("Interpreting voice input:", text);
      
      const response = await fetch('/api/voice/interpret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript: text }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to interpret command');
      }
      
      const data = await response.json();
      console.log("Voice interpretation result:", data);
      
      if (data && data.intent) {
        setInterpretedCommand(data);
      } else {
        toast({
          title: "Command Not Recognized",
          description: "Sorry, I couldn't understand that command. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error interpreting voice command:', error);
      toast({
        title: "Processing Error",
        description: "There was an error processing your command. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const resetRecognition = () => {
    setTranscript('');
    setInterpretedCommand(null);
  };
  
  return {
    isListening,
    transcript,
    interpretedCommand,
    isProcessing,
    toggleListening,
    resetRecognition
  };
};

// Add TypeScript declaration for WebkitSpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: {
      new(): SpeechRecognition;
      prototype: SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new(): SpeechRecognition;
      prototype: SpeechRecognition;
    };
  }
}
