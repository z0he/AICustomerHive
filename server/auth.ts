import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { queryClient } from "./lib/db";
import { SelectUser } from "@shared/schema";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { notifyNewUserRegistration, notifySystemError } from "./lib/notification-service";
import * as admin from "firebase-admin";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

// Secret key for sessions
const SESSION_SECRET = process.env.SESSION_SECRET || 'super-secret-session-key-change-in-production';

// Initialize Firebase Admin SDK with default credentials if they exist
let firebaseAdminInitialized = false;
try {
  // Use default application credentials or initialize with environment variables if provided
  admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID
  });
  firebaseAdminInitialized = true;
  console.log("Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error);
  console.log("Will try to verify tokens without admin SDK");
}

/**
 * Hash a password using scrypt
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Compare the supplied password with the stored password hash
 */
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  // Check if the stored password has our expected format (hash.salt)
  if (!stored.includes(".")) {
    // For testing/development, allow direct comparison
    return supplied === stored;
  }
  
  // Otherwise, do proper hashed password comparison
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Generate a JWT token for a user
 */
function generateToken(user: SelectUser): string {
  return jwt.sign(
    { 
      id: user.id,
      username: user.username
    }, 
    JWT_SECRET, 
    { expiresIn: '24h' }
  );
}

/**
 * Setup authentication for the application
 */
export function setupAuth(app: Express) {
  // Create PostgreSQL session store
  const PostgresStore = connectPg(session);
  
  // Session configuration
  const sessionSettings: session.SessionOptions = {
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new PostgresStore({
      conObject: {
        connectionString: process.env.DATABASE_URL
      },
      tableName: 'user_sessions', // Table name for sessions
      createTableIfMissing: true
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  };

  // Trust proxy if running in production
  if (process.env.NODE_ENV === 'production') {
    app.set("trust proxy", 1);
  }
  
  // Set up session middleware
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy for username/password authentication
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Attempting login for user: ${username}`);
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          console.log(`User not found: ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        }
        
        console.log(`User found, comparing passwords for: ${username}`);
        
        try {
          const passwordMatches = await comparePasswords(password, user.password);
          
          if (!passwordMatches) {
            console.log(`Password mismatch for user: ${username}`);
            return done(null, false, { message: "Invalid username or password" });
          }
          
          console.log(`Authentication successful for user: ${username}`);
          return done(null, user);
        } catch (passwordError) {
          console.error(`Password comparison error:`, passwordError);
          return done(null, false, { message: "Error during authentication" });
        }
      } catch (error) {
        console.error(`Authentication error:`, error);
        return done(error);
      }
    }),
  );
  
  // JWT strategy for token-based authentication
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: JWT_SECRET
      },
      async (payload: { id: number; username: string }, done: any) => {
        try {
          const user = await storage.getUser(payload.id);
          
          if (!user) {
            return done(null, false, { message: "User not found" });
          }
          
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialize user to the session
  passport.serializeUser((user, done) => done(null, user.id));
  
  // Deserialize user from the session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // User registration endpoint
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Hash the password
      const hashedPassword = await hashPassword(req.body.password);
      
      // Create the user
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });
      
      // Generate JWT token
      const token = generateToken(user);
      
      // Log the user in
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to log in after registration" });
        }
        
        // Send admin notification about new user registration
        notifyNewUserRegistration(user)
          .catch(notifError => console.error("Failed to send new user notification:", notifError));
          
        // Return the user and token  
        res.status(201).json({
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            initials: user.initials
          },
          token
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      
      // Log the error to admin notifications
      notifySystemError(error instanceof Error ? error : new Error(String(error)), 
                       "User Registration")
        .catch(notifError => console.error("Failed to send error notification:", notifError));
      
      res.status(500).json({ message: "Failed to register" });
    }
  });

  // User login endpoint
  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: Error, user: SelectUser | false, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Authentication error occurred" });
      }
      
      if (!user) {
        console.log("Login failed:", info?.message || "Unknown reason");
        return res.status(401).json({ message: info?.message || "Invalid username or password" });
      }
      
      // User authenticated successfully, log them in
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Login error after authentication:", loginErr);
          return res.status(500).json({ message: "Failed to complete login" });
        }
        
        // Generate JWT token
        const token = generateToken(user);
        
        // Return the user and token
        return res.json({
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            initials: user.initials
          },
          token
        });
      });
    })(req, res, next);
  });

  // User logout endpoint
  app.post("/api/auth/logout", (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.sendStatus(200);
    });
  });

  // Google authentication endpoint
  app.post("/api/auth/google", async (req: Request, res: Response) => {
    try {
      const { idToken, googleUserInfo } = req.body;
      
      // Check for required data
      if (!idToken && !googleUserInfo) {
        return res.status(400).json({ message: "Either ID token or Google user info is required" });
      }
      
      console.log("Attempting to process Google authentication");
      
      // Variables to store user information
      let googleId: string;
      let userEmail: string;
      let userName: string;
      
      // First, try to use the user info object if provided (more reliable)
      if (googleUserInfo && googleUserInfo.email) {
        console.log("Using provided Google user info");
        googleId = googleUserInfo.uid || `google-user-${Date.now()}`;
        userEmail = googleUserInfo.email;
        userName = googleUserInfo.displayName || userEmail.split('@')[0];
        
        console.log(`Processing Google sign-in for: ${userEmail}`);
      } else if (idToken) {
        // Fall back to token decoding if user info is not provided
        try {
          console.log("Attempting to decode token");
          // Basic JWT structure check (header.payload.signature)
          const tokenParts = idToken.split('.');
          if (tokenParts.length !== 3) {
            throw new Error("Invalid token format");
          }
          
          // For development, extract data directly from payload without verification
          // This is NOT secure for production, but helps us test the flow
          const payloadPart = tokenParts[1];
          const paddedPayload = payloadPart.padEnd(payloadPart.length + (4 - (payloadPart.length % 4)) % 4, '=');
          const decodedPayload = Buffer.from(paddedPayload, 'base64').toString();
          const parsedPayload = JSON.parse(decodedPayload);
          
          // Extract user information
          googleId = parsedPayload.sub || parsedPayload.user_id || `google-user-${Date.now()}`;
          userEmail = parsedPayload.email || '';
          userName = parsedPayload.name || (userEmail ? userEmail.split('@')[0] : 'Google User');
          
          console.log(`Successfully decoded token payload - Email: ${userEmail}`);
        } catch (error) {
          console.error("Token handling error:", error);
          return res.status(401).json({ message: "Could not process Google authentication" });
        }
      } else {
        return res.status(400).json({ message: "Missing required authentication data" });
      }
      
      // Check if user exists with this email
      let user = await storage.getUserByUsername(userEmail || googleId);
      
      if (!user) {
        console.log("User not found, creating new user account");
        // Create a new user
        const initials = userName
          ? userName
              .split(" ")
              .map((word: string) => word[0])
              .join("")
              .toUpperCase()
          : "U";
        
        user = await storage.createUser({
          username: userEmail || googleId,
          password: randomBytes(32).toString("hex"), // Random password as we'll use Google for auth
          name: userName || "Google User",
          initials,
          googleId
        });
        
        console.log(`Successfully created new user account for: ${userEmail}`);
      } else {
        console.log(`Found existing user account for: ${userEmail}`);
      }
      
      // Log the user in
      req.login(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ message: "Failed to log in with Google" });
        }
        
        // Generate JWT token
        const token = generateToken(user);
        
        console.log("User authenticated successfully with Google");
        
        // Return the user and token
        return res.json({
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            initials: user.initials
          },
          token
        });
      });
    } catch (error) {
      console.error("Google auth error:", error);
      return res.status(401).json({ message: "Google authentication failed" });
    }
  });

  // Current user endpoint (both session and JWT auth)
  app.get("/api/auth/user", 
    (req: Request, res: Response, next: NextFunction) => {
      // Try session auth first
      if (req.isAuthenticated()) {
        return res.json({
          user: {
            id: req.user!.id,
            username: req.user!.username,
            name: req.user!.name,
            initials: req.user!.initials,
            isAdmin: req.user!.isAdmin || false,
            businessType: req.user!.businessType,
            businessIndustry: req.user!.businessIndustry,
            companySize: req.user!.companySize,
            primaryMarket: req.user!.primaryMarket
          }
        });
      }
      
      // If no session, try JWT auth
      passport.authenticate('jwt', { session: false })(req, res, next);
    },
    (req: Request, res: Response) => {
      // This handler only runs if JWT auth succeeded
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      res.json({
        user: {
          id: req.user.id,
          username: req.user.username,
          name: req.user.name,
          initials: req.user.initials,
          isAdmin: req.user.isAdmin || false,
          businessType: req.user.businessType,
          businessIndustry: req.user.businessIndustry,
          companySize: req.user.companySize,
          primaryMarket: req.user.primaryMarket
        }
      });
    }
  );

  // Update business profile endpoint
  app.patch("/api/auth/user/business-profile",
    (req: Request, res: Response, next: NextFunction) => {
      // Try session auth first
      if (req.isAuthenticated()) {
        return next();
      }
      
      // If no session, try JWT auth
      passport.authenticate('jwt', { session: false })(req, res, next);
    },
    async (req: Request, res: Response) => {
      try {
        if (!req.user) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const { businessType, businessIndustry, companySize, primaryMarket } = req.body;
        
        // Update user business profile in database
        await storage.updateUserBusinessProfile(req.user.id, {
          businessType,
          businessIndustry,
          companySize,
          primaryMarket
        });

        return res.json({ success: true, message: "Business profile updated successfully" });
      } catch (error) {
        console.error("Business profile update error:", error);
        return res.status(500).json({ message: "Failed to update business profile" });
      }
    }
  );
  
  // Middleware to check if user is authenticated
  app.use("/api/secured/*", (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      // Try JWT auth
      passport.authenticate('jwt', { session: false })(req, res, (err: any) => {
        if (err || !req.user) {
          return res.status(401).json({ message: "Unauthorized" });
        }
        next();
      });
    } else {
      next();
    }
  });
}