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
  const [isBrowserSupported, setIsBrowserSupported] = useState<boolean>(false);
  const { toast } = useToast();
  
  // Use useRef to maintain the recognition instance across renders
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Check browser support on initialization
  useEffect(() => {
    const isSupported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    setIsBrowserSupported(isSupported);
    
    if (!isSupported) {
      console.warn("Speech Recognition API is not supported in this browser");
    }
  }, []);
  
  // Initialize speech recognition
  useEffect(() => {
    // Check if browser supports speech recognition
    if (isBrowserSupported) {
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
          
          // If we ended with no transcript, show a message
          if (!currentTranscript && !isProcessing) {
            toast({
              title: "No Speech Detected",
              description: "We didn't hear anything. Please try speaking louder or check your microphone.",
              variant: "default"
            });
          }
        }
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        console.error('Speech recognition error', event.error);
        
        let errorMessage = "An error occurred with voice recognition. Please try again.";
        
        // Provide more specific error messages based on the error type
        switch (event.error) {
          case 'not-allowed':
            errorMessage = "Microphone access was denied. Please allow microphone access to use voice commands.";
            break;
          case 'no-speech':
            errorMessage = "No speech was detected. Please try again and speak clearly.";
            break;
          case 'audio-capture':
            errorMessage = "No microphone was found. Please check your device settings.";
            break;
          case 'network':
            errorMessage = "A network error occurred. Please check your connection.";
            break;
          case 'aborted':
            // Don't show error for user-initiated abort
            return;
        }
        
        toast({
          title: "Voice Recognition Error",
          description: errorMessage,
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
  }, [isBrowserSupported, toast]);
  
  const toggleListening = useCallback(() => {
    if (!isBrowserSupported) {
      toast({
        title: "Browser Not Supported",
        description: "Voice recognition is not supported in your browser. Try Chrome, Edge, or Safari.",
        variant: "destructive"
      });
      return;
    }
    
    if (isListening) {
      // If already listening, stop the recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      // Reset existing state
      setTranscript('');
      setInterpretedCommand(null);
      
      // Create a new instance if needed
      if (!recognitionRef.current) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        
        // Make sure we set up event handlers
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
      }
      
      // Try to start recognition
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        toast({
          title: "Error Starting Voice Recognition",
          description: "Please try again or use text commands instead",
          variant: "destructive"
        });
        
        // Try to create a new instance and restart
        try {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = false;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.lang = 'en-US';
          recognitionRef.current.start();
        } catch (secondError) {
          console.error('Failed to restart speech recognition:', secondError);
        }
      }
    }
  }, [isListening, isBrowserSupported, toast]);
  
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
    isBrowserSupported,
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
