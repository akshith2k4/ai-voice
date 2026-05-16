import React, { useEffect, useState } from "react";
import {
    Box,
    TextField,
    Button,
    Typography,
    Container,
    Paper,
    Alert,
    CircularProgress,
    InputAdornment,
    IconButton,
    Link,
    Divider,
    Checkbox,
    FormControlLabel,
} from "@mui/material";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/auth";

function Login() {
    const [credentials, setCredentials] = useState({
        emailOrPhone: "",
        password: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [remember] = useState(true);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // If already logged in, skip login screen
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            navigate('/hotels', { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        // Trim only the email/phone; do NOT trim password to respect user input
        setCredentials((prev) => ({
            ...prev,
            [name]: name === "emailOrPhone" ? value.trim() : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!credentials.emailOrPhone || !credentials.password) {
            setError("Please enter both Email/Phone and Password.");
            return;
        }

        setLoading(true);
        try {
            await login({ ...credentials, remember }); // storage handled inside
            navigate("/hotels");
        } catch (err) {
            const message =
                err?.response?.data?.message || "Invalid email or password";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                position: "relative",
                height: "100vh",
                backgroundImage:
                    "url(https://res.cloudinary.com/dtdhmbtcg/image/upload/v1757767727/ChatGPT_Image_Sep_13_2025_06_00_48_PM_fo2pzj.png)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            {/* Overlay for contrast */}
            <Box
                sx={{
                    position: "absolute",
                    inset: 0,
                    background:
                        "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)",
                    zIndex: 1,
                }}
            />
            <Container
                component="main"
                maxWidth="xs"
                sx={{ position: "relative", zIndex: 2 }}
            >
                <Paper
                    elevation={8}
                    sx={{
                        p: 4,
                        borderRadius: 3,
                        backdropFilter: "blur(8px)",
                        backgroundColor: "rgba(255, 255, 255, 0.92)",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                    }}
                >
                    {/* Logo + Title */}
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            mb: 2,
                        }}
                    >
                        <Box
                            component="img"
                            src="/flash.png"
                            alt="Flash Logo"
                            sx={{
                                width: 64,
                                height: 64,
                                mb: 1,
                                borderRadius: 2,
                            }}
                        />
                        <Typography
                            component="h1"
                            variant="h5"
                            sx={{  color: "green" }}
                        >
                            Welcome to Flash
                        </Typography>
                        {/* <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, textAlign: 'center' }}>
              Sign in to continue to your dashboard
            </Typography> */}
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        noValidate
                        sx={{ mt: 1 }}
                    >
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            autoFocus
                            name="emailOrPhone"
                            label="Email"
                            id="emailOrPhone"
                            value={credentials.emailOrPhone}
                            onChange={handleChange}
                            placeholder="john@example.com"
                            // InputProps={{
                            //   startAdornment: (
                            //     <InputAdornment position="start">
                            //       <EmailRoundedIcon sx={{ color: 'text.secondary' }} />
                            //     </InputAdornment>
                            //   ),
                            // }}
                        />

                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            type={showPassword ? "text" : "password"}
                            name="password"
                            label="Password"
                            id="password"
                            value={credentials.password}
                            onChange={handleChange}
                            InputProps={{
                                // startAdornment: (
                                //   <InputAdornment position="start">
                                //     <LockRoundedIcon sx={{ color: 'text.secondary' }} />
                                //   </InputAdornment>
                                // ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label={
                                                showPassword
                                                    ? "Hide password"
                                                    : "Show password"
                                            }
                                            onClick={() =>
                                                setShowPassword((s) => !s)
                                            }
                                            edge="end"
                                        >
                                            {showPassword ? (
                                                <VisibilityOffRoundedIcon />
                                            ) : (
                                                <VisibilityRoundedIcon />
                                            )}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {/* <Box
              sx={{
                mt: 1,
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    color="primary"
                    size="small"
                  />
                }
                label={<Typography variant="body2">Remember me</Typography>}
              />
              <Link component="button" type="button" variant="body2" sx={{ color: 'primary.main' }}>
                Forgot password?
              </Link>
            </Box> */}

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                            endIcon={
                                !loading ? <ArrowForwardRoundedIcon /> : null
                            }
                            sx={{
                                mt: 2,
                                mb: 1,
                                borderRadius: 2,
                                py: 1.2,
                            }}
                        >
                            {loading ? (
                                <CircularProgress
                                    size={22}
                                    sx={{ color: "white" }}
                                />
                            ) : (
                                "Sign In"
                            )}
                        </Button>

                        <Divider sx={{ my: 2 }} />
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                mt: 2,
                                gap: 1,
                            }}
                        >
                            <Box
                                component="img"
                                src="/linen.png"
                                alt="LinenGrass Logo"
                                sx={{ width: 20, height: 20 }}
                            />
                            LinenGrass | Linen Management
                        </Typography>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}

export default Login;
