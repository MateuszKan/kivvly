"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

// Firebase imports
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { FirebaseError } from "firebase/app";

// Your local Firebase config
import { auth, db } from "@/lib/firebase";

// UI components (example uses shadcn/ui)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

// Icons
import { FcGoogle } from "react-icons/fc";

// Simple registration check with Zod
import { z, ZodError } from "zod";

// Zod schema for registration
const registrationSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  email: z.string().email("Invalid email address."),
  password: z
    .string()
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
      "Password must be at least 8 characters including 1 digit."
    ),
});

export default function AuthPage() {
  const router = useRouter();

  // Global feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /* ---------------------------- LOGIN STATES ---------------------------- */
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  /* --------------------------- REGISTER STATES -------------------------- */
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  /**
   * Handle Email/Password Login
   * (Block if isVerified === "no")
   */
  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      // 1) Sign in
      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginEmail,
        loginPassword
      );
      const user = userCredential.user;

      // 2) Check Firestore doc
      const docRef = doc(db, "users", user.uid);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();

        // 2a) Check ban
        if (data.isBanned) {
          await signOut(auth);
          setErrorMessage("Your account has been banned.");
          return;
        }

        // 2b) Check if isVerified = "no"
        if (data.isVerified === "no") {
          await signOut(auth);
          setErrorMessage("Please verify your email before logging in.");
          return;
        }

      } else {
        // If user doc doesn't exist, optional logic here
        // For consistency, let's sign them out or create a doc
        await signOut(auth);
        setErrorMessage("No user document found. Please contact support.");
        return;
      }

      // 3) If all is good, redirect (e.g., to home)
      router.push("/");
    } catch (err) {
      if (err instanceof FirebaseError) {
        setErrorMessage(err.message || "Failed to log in. Please try again.");
      } else if (err instanceof Error) {
        setErrorMessage(err.message || "Failed to log in. Please try again.");
      } else {
        setErrorMessage("Failed to log in. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Forgot Password (Login tab)
   */
  async function handleForgotPasswordLogin() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (!loginEmail) {
        throw new Error("Please enter your email in the Email field first.");
      }
      await sendPasswordResetEmail(auth, loginEmail);
      setSuccessMessage("Password reset link sent to your email!");
    } catch (err) {
      if (err instanceof Error) {
        setErrorMessage(err.message || "Failed to send password reset.");
      } else {
        setErrorMessage("Failed to send password reset.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Handle Email/Password Registration
   */
  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      // Validate input with Zod
      registrationSchema.parse({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
      });

      // 1) Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        registerEmail,
        registerPassword
      );
      const user = userCredential.user;

      // 2) Update displayName
      await updateProfile(user, { displayName: registerName });

      // 3) Send built-in verification link
      await sendEmailVerification(user);

      // 4) Create user doc -> isVerified: "no" for email/password
      await setDoc(doc(db, "users", user.uid), {
        email: registerEmail,
        displayName: registerName,
        avatarUrl: "/default-avatar.png",
        isBanned: false,
        isVerified: "no", // Mark "no" initially
        createdAt: serverTimestamp(),
      });

      setSuccessMessage(
        "Account created! We sent a verification link to your email."
      );
    } catch (err) {
      if (err instanceof ZodError) {
        setErrorMessage(err.issues[0].message);
      } else if (
        err instanceof FirebaseError &&
        err.code === "auth/email-already-in-use"
      ) {
        setErrorMessage(
          "This email is already registered. Use another one or reset your password."
        );
      } else if (err instanceof FirebaseError) {
        setErrorMessage(err.message || "Failed to create account.");
      } else if (err instanceof Error) {
        setErrorMessage(err.message || "Failed to create account.");
      } else {
        setErrorMessage("Failed to create account.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Forgot Password (Register tab)
   */
  async function handleForgotPasswordRegister() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (!registerEmail) {
        throw new Error(
          "Please enter your email in the registration form first."
        );
      }
      await sendPasswordResetEmail(auth, registerEmail);
      setSuccessMessage("Password reset link sent!");
    } catch (err) {
      if (err instanceof Error) {
        setErrorMessage(err.message || "Failed to send password reset.");
      } else {
        setErrorMessage("Failed to send password reset.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Google Sign In (OAuth)
   * (If you want to block unverified Google users, you'd need to implement a separate flow.)
   */
  async function handleGoogleLogin() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Truncate displayName to max 10 chars
      let truncatedName = user.displayName || "No Name";
      if (truncatedName.length > 10) {
        truncatedName = truncatedName.slice(0, 10);
      }

      // Check if user doc exists
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        // If doc exists, check ban status
        const data = snap.data();
        if (data.isBanned) {
          await signOut(auth);
          setErrorMessage("Your account has been banned.");
          return;
        }
      } else {
        // Create doc with isVerified: "yes" for Google sign-in
        await setDoc(userRef, {
          email: user.email,
          displayName: truncatedName,
          avatarUrl:
            user.photoURL || "https://via.placeholder.com/128?text=No+Avatar",
          isBanned: false,
          isVerified: "yes", // Google => "yes"
          createdAt: serverTimestamp(),
        });
      }

      // Then redirect or show success
      router.push("/");
    } catch (err) {
      if (err instanceof FirebaseError) {
        setErrorMessage(err.message || "Failed to log in with Google.");
      } else if (err instanceof Error) {
        setErrorMessage(err.message || "Failed to log in with Google.");
      } else {
        setErrorMessage("Failed to log in with Google.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative w-full h-screen flex flex-col bg-gray-100">
      <div className="flex-grow flex items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Login or create an account.</CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <p className="text-red-600 text-sm mb-4">{errorMessage}</p>
            )}
            {successMessage && (
              <p className="text-green-600 text-sm mb-4">{successMessage}</p>
            )}

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              {/* --------------------------- LOGIN TAB --------------------------- */}
              <TabsContent value="login">
                <form onSubmit={handleLogin}>
                  <div className="grid gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="loginEmail">Email</Label>
                      <Input
                        id="loginEmail"
                        type="email"
                        placeholder="Enter your email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="loginPassword">Password</Label>
                      <Input
                        id="loginPassword"
                        type="password"
                        placeholder="Enter your password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full mt-6"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>

                  {/* Forgot password - Login */}
                  <div className="text-center mt-2">
                    <button
                      type="button"
                      onClick={handleForgotPasswordLogin}
                      disabled={isLoading}
                      className="text-sm text-blue-600 underline"
                    >
                      Forgot your password?
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  {/* Google Sign In (centered) */}
                  <div className="flex flex-col space-y-2">
                    <Button
                      variant="outline"
                      type="button"
                      disabled={isLoading}
                      onClick={handleGoogleLogin}
                    >
                      <FcGoogle className="mr-2 h-4 w-4" />
                      Google
                    </Button>
                  </div>
                </form>
              </TabsContent>

              {/* --------------------------- REGISTER TAB --------------------------- */}
              <TabsContent value="register">
                <form onSubmit={handleRegister}>
                  <div className="grid gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="rName">Name</Label>
                      <Input
                        id="rName"
                        placeholder="Minimum 3 characters"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="rEmail">Email</Label>
                      <Input
                        id="rEmail"
                        type="email"
                        placeholder="Enter your email"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="rPassword">Password</Label>
                      <Input
                        id="rPassword"
                        type="password"
                        placeholder="Password must be at least 8 characters including 1 digit."
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full mt-6"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Create account"}
                  </Button>

                  {/* Forgot password - Register */}
                  <div className="text-center mt-2">
                    <button
                      type="button"
                      onClick={handleForgotPasswordRegister}
                      disabled={isLoading}
                      className="text-sm text-blue-600 underline"
                    >
                      Forgot your password?
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  {/* Google Sign In (centered) */}
                  <div className="flex flex-col space-y-2">
                    <Button
                      variant="outline"
                      type="button"
                      disabled={isLoading}
                      onClick={handleGoogleLogin}
                    >
                      <FcGoogle className="mr-2 h-4 w-4" />
                      Google
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
