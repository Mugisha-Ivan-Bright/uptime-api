import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Terminal from "../components/ui/Terminal";
import Input from "../components/ui/Input";
import { useAuth } from "../hooks/useAuth";

const registerSchema = z.object({
  orgName: z.string().min(2, "Organization name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegisterForm = z.infer<typeof registerSchema>;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function Register() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      orgName: "",
      slug: "",
      email: "",
      password: "",
    },
  });

  const orgName = watch("orgName");

  const handleOrgNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setValue("orgName", val);
      const slug = generateSlug(val);
      setValue("slug", slug);
    },
    [setValue]
  );

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    try {
      await registerUser(data.orgName, data.slug, data.email, data.password);
      navigate("/dashboard");
    } catch (err) {
      setError((err as Error).message || "Registration failed");
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
          CREATE YOUR ACCOUNT
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
              Organization Name
            </label>
            <Input
              placeholder="My Company"
              {...register("orgName", { onChange: handleOrgNameChange })}
              style={{
                width: "100%",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "12px",
              }}
            />
            {errors.orgName && (
              <span
                style={{
                  color: "var(--red, #ff3333)",
                  fontSize: "10px",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                {errors.orgName.message}
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
              Slug
            </label>
            <Input
              placeholder="my-company"
              {...register("slug")}
              style={{
                width: "100%",
                fontFamily: "IBM Plex Mono, monospace",
                fontSize: "12px",
              }}
            />
            <span
              style={{
                fontSize: "9px",
                color: "var(--text-muted, #666)",
                marginTop: "2px",
                display: "block",
              }}
            >
              Auto-generated from organization name
            </span>
            {errors.slug && (
              <span
                style={{
                  color: "var(--red, #ff3333)",
                  fontSize: "10px",
                  marginTop: "4px",
                  display: "block",
                }}
              >
                {errors.slug.message}
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
              placeholder="Min. 8 characters"
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
            CREATE ACCOUNT
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
          Already have an account?{" "}
          <Link
            to="/login"
            style={{
              color: "var(--accent, #fff)",
              textDecoration: "none",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "10px",
              letterSpacing: "0.1em",
            }}
          >
            SIGN IN →
          </Link>
        </div>
      </Card>
    </div>
  );
}
