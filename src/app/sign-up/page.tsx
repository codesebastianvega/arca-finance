import { redirect } from "next/navigation";

type AuthPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const query = params.error ? `?error=${encodeURIComponent(params.error)}` : "";
  redirect(`/sign-in${query}`);
}
