/**
 * app/login/page.tsx
 * Login page for the Quizz.It application
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
import { auth } from "../../firebase"
import { signInWithEmailAndPassword } from "firebase/auth";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { InputAdornment } from "@mui/material";
import Loading from "@/components/Loading";
import { useRouter } from "next/navigation";

export default function Login() {
  const defaultTheme = createTheme();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationStatus, setValidationStatus] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validationStatusStyles: React.CSSProperties = {
    color: "rgb(255, 0, 0)",
    textAlign: "center",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "10px auto",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!email) {
        setValidationStatus(
          "The email cannot be blank. Please enter a valid one and try again!"
        );
        return;
      } else if (!password) {
        setValidationStatus(
          "The password cannot be blank. Please enter a valid one and try again!"
        );
        return;
      }

      setValidationStatus("Loading...");

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      if (user.emailVerified) {
        setValidationStatus("");
        sessionStorage.setItem(
          "username",
          user.email ? user.email.substring(0, email.indexOf("@")) : ""
        );
        setLoading(true);
        setTimeout(() => {
            router.push("/app")
          setLoading(false);
        }, 2000);
      } else {
        setValidationStatus(
          "You need to verify your email before you can log in!"
        );
        return;
      }
    } catch (e: any) {
      switch (e.code) {
        case "auth/invalid-email":
          setValidationStatus(
            "The provided email is not in the right format. Please enter a valid one and try again"
          );
          break;
        case "auth/too-many-requests":
          setValidationStatus(
            "Too many log in attempts. Please wait for a few minutes and try again!"
          );
          break;
        case "auth/invalid-credential":
          setValidationStatus(
            "The credentials you have entered are either non-existent or wrong. Please try again!"
          );
          break;
        default:
          setValidationStatus(
            "An unknown error occurred when logging in. Please try again!"
          );
          break;
      }
    }
  }

  return (
    <>
      {loading ? (
        <Loading
          action={"Sign in successful. Redirecting you to the application..."}
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
                Sign in
              </Typography>
              <Box
                component="form"
                onSubmit={handleSubmit}
                noValidate
                sx={{ mt: 1 }}
              >
                <TextField
                  disabled={validationStatus === "Loading..."}
                  onFocus={() => setValidationStatus("")}
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  onChange={(e) => setEmail(e.target.value)}
                  value={email}
                />
                <TextField
                  disabled={validationStatus === "Loading..."}
                  onFocus={() => setValidationStatus("")}
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  id="password"
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  value={password}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <div
                          onClick={() => setShowPassword((prev) => !prev)}
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
                <div
                  className="validationStatus"
                  style={validationStatusStyles}
                >
                  {validationStatus}
                </div>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={validationStatus === "Loading..."}
                >
                  Sign In
                </Button>
                <Grid container spacing={2}>
                  <Grid item xs>
                    <Link
                      href="/"
                      variant="body2"
                    >
                      {"Back to Home"}
                    </Link>
                  </Grid>
                  <Grid item>
                    <Link
                      href="/sign-up"
                      variant="body2"
                    >
                      {"Don't have an account? Sign Up"}
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