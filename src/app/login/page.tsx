"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  TwitterAuthProvider,
  OAuthProvider,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

// Import FirebaseError from Firebase's app package
import { FirebaseError } from "firebase/app";

import { z, ZodError } from "zod";

import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// React icons (used for OAuth provider buttons)
import { FcGoogle } from "react-icons/fc";
import { FaGithub, FaTwitter, FaApple } from "react-icons/fa";

/**
 * Zod schema for validating registration fields:
 * - Name: Minimum 6 characters.
 * - Email: Must be valid.
 * - Password: At least 8 characters, including at least one letter and one digit.
 */
const registrationSchema = z.object({
  registerName: z.string().min(6, "Name must be at least 6 characters."),
  registerEmail: z.string().email("Invalid email address."),
  registerPassword: z
    .string()
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
      "Password must be at least 8 characters, including at least 1 letter and 1 digit."
    ),
});

export default function AuthPage() {
  const router = useRouter();

  // Loading & message states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- Login form state ---
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // --- Register form state ---
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  /**
   * Handle Email/Password Login
   */
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      router.push("/");
    } catch (error: unknown) {
      if (error instanceof Error) {
        setErrorMessage(error.message || "Failed to log in. Please try again.");
      } else {
        setErrorMessage("Failed to log in. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Email/Password Registration
   * - Uses Zod to validate registration fields.
   * - If the email is already in use, shows a message suggesting the user use the "Forgot your password?" link.
   */
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Validate the input using Zod
      registrationSchema.parse({
        registerName,
        registerEmail,
        registerPassword,
      });

      // Create a new user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        registerEmail,
        registerPassword
      );
      const user = userCredential.user;

      // Update the user's displayName in Firebase Auth
      await updateProfile(user, { displayName: registerName });

      // Store additional user info in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: registerEmail,
        displayName: registerName,
        avatarUrl: "https://via.placeholder.com/128?text=No+Avatar",
        jobOccupation: "",
        isAdmin: false,
        isBanned: false,
        createdAt: serverTimestamp(),
      });

      // Send verification email (optional)
      await sendEmailVerification(user);
      setSuccessMessage(
        "Registration successful! A verification link has been sent to your email."
      );

      // Optionally, redirect after registration:
      // router.push("/");
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        setErrorMessage(error.issues[0].message);
      } else if (error instanceof FirebaseError && error.code === "auth/email-already-in-use") {
        setErrorMessage(
          "This email is already registered. If you forgot your password, please click the 'Forgot your password?' link below."
        );
      } else if (error instanceof Error) {
        setErrorMessage(
          error.message || "Failed to create an account. Please try again."
        );
      } else {
        setErrorMessage("Failed to create an account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle "Forgot Password" from the Register tab
   * - Uses the email entered in the registration form.
   */
  const handleForgotPasswordRegister = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!registerEmail) {
        throw new Error(
          "Please enter your email in the registration form before requesting a password reset."
        );
      }
      await sendPasswordResetEmail(auth, registerEmail);
      setSuccessMessage(
        "A password reset link has been sent to the registration email."
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        setErrorMessage(error.message || "Failed to send password reset. Please try again.");
      } else {
        setErrorMessage("Failed to send password reset. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle OAuth Providers (Google, GitHub, Twitter, Apple)
   * - Preserves existing data if user doc already exists, so as not to overwrite isAdmin or other fields.
   */
  const handleProviderLogin = async (providerName: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    let providerInstance:
      | GoogleAuthProvider
      | GithubAuthProvider
      | TwitterAuthProvider
      | OAuthProvider;

    switch (providerName) {
      case "Google":
        providerInstance = new GoogleAuthProvider();
        break;
      case "GitHub":
        providerInstance = new GithubAuthProvider();
        break;
      case "Twitter":
        providerInstance = new TwitterAuthProvider();
        break;
      case "Apple":
        // Apple uses the generic OAuthProvider with 'apple.com'
        providerInstance = new OAuthProvider("apple.com");
        break;
      default:
        return;
    }

    try {
      const userCredential = await signInWithPopup(auth, providerInstance);
      const user = userCredential.user;

      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        // If the user doc already exists, merge ONLY the fields we want to update.
        await setDoc(
          userRef,
          {
            email: user.email,
            displayName: user.displayName || "No Name",
            avatarUrl:
              user.photoURL || "https://via.placeholder.com/128?text=No+Avatar",
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        // If doc doesn't exist yet, create a new one with default values
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName || "No Name",
          avatarUrl:
            user.photoURL || "https://via.placeholder.com/128?text=No+Avatar",
          jobOccupation: "",
          isAdmin: false,
          isBanned: false,
          createdAt: serverTimestamp(),
        });
      }

      router.push("/");
    } catch (error: unknown) {
      if (error instanceof Error) {
        setErrorMessage(
          error.message || `Failed to log in with ${providerName}.`
        );
      } else {
        setErrorMessage(`Failed to log in with ${providerName}.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle "Forgot Password" from the Login tab
   * - Uses the email entered in the login form.
   */
  const handleForgotPasswordLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!loginEmail) {
        throw new Error("Please enter your email in the Email field first.");
      }
      await sendPasswordResetEmail(auth, loginEmail);
      setSuccessMessage("A password reset link has been sent to your email.");
    } catch (error: unknown) {
      if (error instanceof Error) {
        setErrorMessage(error.message || "Failed to send password reset. Please try again.");
      } else {
        setErrorMessage("Failed to send password reset. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow flex items-center justify-center bg-gray-100">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Login or create an account to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <div className="mb-4">
                <p className="text-red-600 text-sm">{errorMessage}</p>
              </div>
            )}
            {successMessage && (
              <p className="text-green-600 text-sm mb-4">{successMessage}</p>
            )}

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              {/* ---------- LOGIN TAB ---------- */}
              <TabsContent value="login">
                <form onSubmit={handleLogin}>
                  <div className="grid w-full items-center gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        placeholder="Enter your email"
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        placeholder="Enter your password"
                        type="password"
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

                  {/* Forgot Password for Login */}
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
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  {/* OAuth buttons */}
                  <div className="flex flex-col space-y-2">
                    <Button
                      variant="outline"
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleProviderLogin("Google")}
                    >
                      <FcGoogle className="mr-2 h-4 w-4" />
                      Google
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleProviderLogin("GitHub")}
                    >
                      <FaGithub className="mr-2 h-4 w-4" />
                      GitHub
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleProviderLogin("Twitter")}
                    >
                      <FaTwitter className="mr-2 h-4 w-4" />
                      Twitter
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleProviderLogin("Apple")}
                    >
                      <FaApple className="mr-2 h-4 w-4" />
                      Apple
                    </Button>
                  </div>
                </form>
              </TabsContent>

              {/* ---------- REGISTER TAB ---------- */}
              <TabsContent value="register">
                <form onSubmit={handleRegister}>
                  <div className="grid w-full items-center gap-4">
                    {/* Name */}
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="register-name">Name</Label>
                      <Input
                        id="register-name"
                        placeholder="Minimum 6 characters"
                        required
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                      />
                    </div>
                    {/* Email */}
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        placeholder="Enter your email"
                        type="email"
                        required
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                      />
                    </div>
                    {/* Password */}
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        placeholder="Min 8 chars; at least 1 letter & 1 digit"
                        type="password"
                        required
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
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

                  {/* Forgot Password for Register */}
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
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  {/* OAuth buttons */}
                  <div className="flex flex-col space-y-2">
                    <Button
                      variant="outline"
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleProviderLogin("Google")}
                    >
                      <FcGoogle className="mr-2 h-4 w-4" />
                      Google
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleProviderLogin("GitHub")}
                    >
                      <FaGithub className="mr-2 h-4 w-4" />
                      GitHub
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleProviderLogin("Twitter")}
                    >
                      <FaTwitter className="mr-2 h-4 w-4" />
                      Twitter
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleProviderLogin("Apple")}
                    >
                      <FaApple className="mr-2 h-4 w-4" />
                      Apple
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-500">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
