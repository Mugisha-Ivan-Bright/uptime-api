import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Terminal from "../components/ui/Terminal";
import Input from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      await login(data.email, data.password);
      navigate("/dashboard");
    } catch (err) {
      setError((err as Error).message || "Login failed");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base, #0d0d0d)",
        fontFamily: "IBM Plex Mono, monospace",
        padding: "24px",
      }}
    >
      <div
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "18px",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--text-primary, #fff)",
          marginBottom: "32px",
        }}
      >
        UPTIME
      </div>

      <Card
        style={{
          padding: "32px",
          width: "100%",
          maxWidth: "400px",
          fontFamily: "IBM Plex Mono, monospace",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-muted, #888)",
            marginBottom: "24px",
            textAlign: "center",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          SIGN IN TO YOUR ACCOUNT
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "6px",
                color: "var(--text-secondary, #aaa)",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              Email
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              {...register("email")}
              style={{
                width: "100%",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "12px",
              }}
            />
            {errors.email && (
              <span
                style={{
                  color: "var(--red, #ff3333)",
                  fontSize: "10px",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                {errors.email.message}
              </span>
            )}
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "6px",
                color: "var(--text-secondary, #aaa)",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              Password
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              {...register("password")}
              style={{
                width: "100%",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "12px",
              }}
            />
            {errors.password && (
              <span
                style={{
                  color: "var(--red, #ff3333)",
                  fontSize: "10px",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                {errors.password.message}
              </span>
            )}
          </div>

          {error && (
            <Terminal
              lines={[{ type: "error", text: error }]}
            />
          )}

          <Button
            variant="primary"
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "10px",
              letterSpacing: "0.1em",
            }}
          >
            SIGN IN
          </Button>
        </form>

        <div
          style={{
            marginTop: "20px",
            textAlign: "center",
            fontSize: "11px",
            color: "var(--text-muted, #888)",
          }}
        >
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            style={{
              color: "var(--accent, #fff)",
              textDecoration: "none",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "10px",
              letterSpacing: "0.1em",
            }}
          >
            REGISTER →
          </Link>
        </div>
      </Card>
    </div>
  );
}
