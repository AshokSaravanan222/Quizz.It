/**
 * app/sign-up/page.tsx
 * Sign up page for the Quizz.It application
 * @SXV357
 * 08-24-2024
 */
"use client"
import React, { useState } from "react";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Link from "@mui/material/Link";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase"
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { addDoc, collection } from "firebase/firestore";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { InputAdornment } from "@mui/material";
import UseAuthValidation from "../../hooks/UseAuthValidation"
import Loading from "@/components/Loading";
import { useRouter } from "next/navigation";

export default function SignUp() {
  const defaultTheme = createTheme();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationStatus, setValidationStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { isPasswordValid, showPassword, renderDisplay, togglePwDisplay } =
    UseAuthValidation(password);

  function validateEmail(email: string) {
    return fetch(`${window.location.origin}/api/check-email-validity?email=${email}`, {
      method: "GET",
    })
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        return { result: data.result, status: data.status };
      });
  }

  const validationStatusStyles = {
    color: "rgb(255, 0, 0)",
    textAlign: "center" as const,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "10px auto",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      // email checks
      const emailCheck = await validateEmail(email);
      const { result, status } = emailCheck;
      if (!(status === 200)) {
        setValidationStatus(result);
        return;
      }

      // password checks
      if (!isPasswordValid) {
        setValidationStatus("Invalid password. Please try again!");
        return;
      }

      setValidationStatus("Loading...");

      await createUserWithEmailAndPassword(auth, email, password);
      await addDoc(collection(db, "users"), {
        email: email,
        password: password,
      });
      if (!auth.currentUser) {
        setValidationStatus(
          "There was an error when creating the user. Please try again!"
        );
        return;
      }
      await sendEmailVerification(auth.currentUser)
        .then(() => {
          setValidationStatus("");
          setIsLoading(true);
          setTimeout(() => {
            router.push("/login");
            setIsLoading(false);
          }, 2000);
        })
        .catch(() => {
          setValidationStatus(
            "There was an error when sending the email verification link. Please try again!"
          );
          return;
        });

      // create the user now
    } catch (e: any) {
      if (e.code === "auth/email-already-in-use") {
        setValidationStatus(
          "An account already exists with this email address. Please enter a valid one and try again!"
        );
      }
    }
  }

  return (
    <>
      {isLoading ? (
        <Loading
          action={
            "Email verification link sent successfully. Redirecting you to the login page..."
          }
        />
      ) : (
        <ThemeProvider theme={defaultTheme}>
          <Container component="main" maxWidth="xs">
            <CssBaseline />
            <Box
              sx={{
                marginTop: 8,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
                <LockOutlinedIcon />
              </Avatar>
              <Typography component="h1" variant="h5">
                Sign up
              </Typography>
              <Box
                component="form"
                noValidate
                onSubmit={handleSubmit}
                sx={{ mt: 3 }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      onFocus={() => setValidationStatus("")}
                      required
                      fullWidth
                      id="email"
                      label="Email Address"
                      name="email"
                      autoComplete="email"
                      onChange={(e) => setEmail(e.target.value)}
                      value={email}
                      disabled={validationStatus === "Loading..."}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      disabled={validationStatus === "Loading..."}
                      onFocus={() => setValidationStatus("")}
                      required
                      fullWidth
                      name="password"
                      label="Password"
                      type={showPassword ? "text" : "password"}
                      id="password"
                      autoComplete="new-password"
                      onChange={(e) => setPassword(e.target.value)}
                      value={password}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <div
                              onClick={togglePwDisplay}
                              style={{ cursor: "pointer", display: "flex" }}
                            >
                              {!showPassword ? (
                                <VisibilityOffIcon />
                              ) : (
                                <VisibilityIcon />
                              )}
                            </div>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  {renderDisplay()}
                  <div
                    className="validationStatus"
                    style={validationStatusStyles}
                  >
                    {validationStatus}
                  </div>
                </Grid>
                <Button
                  disabled={validationStatus === "Loading..."}
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                >
                  Sign Up
                </Button>
                <Grid container spacing={2}>
                  <Grid item xs>
                    <Link
                      href="/"
                      variant="body2"
                    >
                      {"Back to Landing"}
                    </Link>
                  </Grid>
                  <Grid item>
                    <Link
                      href="/login"
                      variant="body2"
                    >
                      Already have an account? Sign in
                    </Link>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Container>
        </ThemeProvider>
      )}
    </>
  );
}
