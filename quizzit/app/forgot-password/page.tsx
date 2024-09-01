/**
 * app/forgot-password/page.tsx
 * Forgot password page for the Quizz.It application
 * @SXV357
 * 08-24-2024
 */
"use client"
import React, { useState } from "react";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Grid from "@mui/material/Grid";
import CssBaseline from "@mui/material/CssBaseline";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { InputAdornment } from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebase";
import {
  updatePassword,
  signOut,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import UseAuthValidation from "../../hooks/UseAuthValidation";
import Loading from "../../components/Loading";

export default function ForgotPassword() {
  const defaultTheme = createTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [validationStatus, setValidationStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showOldPasword, setShowOldPassword] = useState(false);

  const { isPasswordValid, showPassword, renderDisplay, togglePwDisplay } =
    UseAuthValidation(newPassword);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setValidationStatus(
        "The email cannot be blank. Please enter a valid one and try again!"
      );
      return;
    }
    if (!oldPassword) {
      setValidationStatus(
        "The old password cannot be blank. Please enter a valid one and try again!"
      );
      return;
    }
    if (!newPassword) {
      setValidationStatus(
        "The new password cannot be blank. Please enter a valid one and try again!"
      );
      return;
    } else {
      // password checks
      if (!isPasswordValid) {
        setValidationStatus("Invalid password. Please try again!");
        return;
      }

      setValidationStatus("Loading...");

      const q = query(collection(db, "users"), where("email", "==", email));
      const snapshot = await getDocs(q);
      const docs = snapshot.docs;
      if (docs.length === 0) {
        setValidationStatus(
          "This email is non-existent. Please enter a valid one and try again!"
        );
        return;
      } else {
        const doc = docs[0];
        const data = doc.data();
        if (data.password === newPassword) {
          setValidationStatus(
            "The new password cannot be the same as your previous one. Please use a different one and try again!"
          );
          return;
        } else {
            if (auth.currentUser === null || auth.currentUser.email !== email) { // may need to fix this later
              setValidationStatus(
                "The email you provided does not match the email of the currently logged in user. Please provide the correct email and try again!"
              );
              return;
            }
          const credential = EmailAuthProvider.credential(
            auth.currentUser.email,
            oldPassword
          );
          reauthenticateWithCredential(auth.currentUser, credential)
            .then(async (userCredential) => {
              await updatePassword(userCredential.user, newPassword)
                .then(() => {
                  const ref = doc.ref;
                  updateDoc(ref, { password: newPassword }).then(async () => {
                    setValidationStatus("");
                    await signOut(auth).then(() => {
                      sessionStorage.removeItem("username");
                      setIsLoading(true);
                      setTimeout(() => {
                        navigate("/login");
                        setIsLoading(false);
                      }, 2000);
                    });
                  });
                })
                .catch((e) => {
                  console.log(e);
                  setValidationStatus(
                    "There was an error when updating the password. Please try again!"
                  );
                });
            })
            .catch((e) => {
              if (e.code === "auth/invalid-credential") {
                setValidationStatus(
                  "The email and original password you provided were invalid. Please provide the correct credentials and try again"
                );
                return;
              }
            });
        }
      }
    }
  }

  return (
    <>
      {isLoading ? (
        <Loading
          action={
            "Password reset successful. Signing you out and redirecting you to the login page..."
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
                minWidth: "400px",
              }}
            >
              <Avatar sx={{ m: 1, bgcolor: "secondary.main" }}>
                <LockOutlinedIcon />
              </Avatar>
              <Typography component="h1" variant="h5">
                Forgot Password
              </Typography>
              <Box
                component="form"
                onSubmit={handleSubmit}
                noValidate
                sx={{ mt: 1, width: "100%" }}
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
                  onFocus={() => setValidationStatus("")}
                  disabled={validationStatus === "Loading..."}
                  margin="normal"
                  required
                  fullWidth
                  name="oldPasswod"
                  label="Old Password"
                  id="oldPassword"
                  type={showOldPasword ? "text" : "password"}
                  value={oldPassword}
                  autoComplete="current-password"
                  onChange={(e) => setOldPassword(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <div
                          onClick={() => setShowOldPassword((prev) => !prev)}
                          style={{ cursor: "pointer", display: "flex" }}
                        >
                          {!showOldPasword ? (
                            <VisibilityOffIcon />
                          ) : (
                            <VisibilityIcon />
                          )}
                        </div>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  disabled={validationStatus === "Loading..."}
                  onFocus={() => setValidationStatus("")}
                  margin="normal"
                  required
                  fullWidth
                  name="newPassword"
                  label="New Password"
                  type={showPassword ? "text" : "password"}
                  id="newPassword"
                  autoComplete="current-password"
                  onChange={(e) => setNewPassword(e.target.value)}
                  value={newPassword}
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
                {renderDisplay()}
                <div
                  className="validationStatus"
                  style={{
                    color: "rgb(255, 0, 0)",
                    textAlign: "center",
                    marginTop: "20px",
                  }}
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
                  Reset Password
                </Button>
                <Grid container justifyContent="center">
                  <Link
                    variant="body2"
                    onClick={() => navigate("/app")}
                    style={{ cursor: "pointer" }}
                  >
                    Back to home
                  </Link>
                </Grid>
              </Box>
            </Box>
          </Container>
        </ThemeProvider>
      )}
    </>
  );
}
