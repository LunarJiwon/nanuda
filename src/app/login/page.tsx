"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { LogoMark } from "@/components/LogoMark";
import { Avatar } from "@/components/Avatar";
import { auth } from "@/lib/firebase/client";
import { getUserProfileOnce } from "@/lib/profile-client";
import { useHandleAvailability, handleStatusMessage } from "@/hooks/useHandleAvailability";
import { useObjectUrlPreview } from "@/hooks/useObjectUrlPreview";

function authErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "이메일 또는 비밀번호가 올바르지 않습니다.";
      case "auth/email-already-in-use":
        return "이미 가입된 이메일입니다.";
      case "auth/weak-password":
        return "비밀번호는 6자 이상이어야 합니다.";
      case "auth/invalid-email":
        return "이메일 형식이 올바르지 않습니다.";
      case "auth/popup-closed-by-user":
        return "로그인 창이 닫혔습니다.";
      default:
        return `로그인에 실패했습니다. (${err.code})`;
    }
  }
  if (err instanceof Error && err.name === "HandleTakenError") return err.message;
  return "알 수 없는 오류가 발생했습니다.";
}

export default function LoginPage() {
  const router = useRouter();
  const { signInEmail, signUpEmail, signInGoogle, signInApple } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [bio, setBio] = useState("");
  const [handleInput, setHandleInput] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSignup = mode === "signup";
  const { handle: normalizedHandle, status: handleStatus } = useHandleAvailability(handleInput, isSignup);
  // Live local preview of the chosen avatar file before it's uploaded.
  const avatarPreview = useObjectUrlPreview(avatarFile);

  // Only flagged once the confirm field has content, so it doesn't flash red before the user has
  // had a chance to type anything, and it clears itself as soon as the two fields match again.
  const passwordsMismatch = isSignup && confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmitSignup =
    termsAccepted && handleStatus === "available" && password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isSignup) {
        if (!canSubmitSignup) {
          showToast("핸들과 약관 동의를 확인해주세요.", "error");
          setSubmitting(false);
          return;
        }
        await signUpEmail(name, email, password, {
          handle: normalizedHandle,
          bio: bio.trim(),
          avatarFile,
        });
        // New signup: land on the fresh profile with the welcome/tutorial banner instead of home.
        router.push(`/profile/${normalizedHandle}?welcome=1`);
      } else {
        await signInEmail(email, password);
        showToast("로그인되었습니다.");
        router.push("/");
      }
    } catch (err) {
      showToast(authErrorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await signInGoogle();
      showToast("로그인되었습니다.");
      const uid = auth.currentUser?.uid;
      const profile = uid ? await getUserProfileOnce(uid) : null;
      if (!profile?.handle) {
        router.push("/onboarding");
        return;
      }
      router.push("/");
    } catch (err) {
      showToast(authErrorMessage(err), "error");
    }
  };

  const handleApple = async () => {
    await signInApple();
    showToast("Apple 로그인은 아직 준비 중입니다. 이메일 또는 Google로 로그인해주세요.", "error");
  };

  const handleStatusInfo = handleStatusMessage(handleStatus, normalizedHandle);

  return (
    <section className="min-h-full flex items-center justify-center px-6 py-14">
      <div className="w-full max-w-[352px]">
        <div className="flex flex-col items-center mb-[30px]">
          <LogoMark className="w-[46px] h-[46px]" />
          <h1 className="font-bold text-[24px] tracking-[-0.03em] mt-[18px] mb-[6px]">
            {isSignup ? "나누다에 가입하기" : "다시 오신 걸 환영합니다"}
          </h1>
          <p className="text-[13.5px] text-[#8a887f] m-0">
            {isSignup ? "계정을 만들고 당신의 방을 열어보세요." : "나누다에 로그인하고 기록을 이어가세요."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[10px]">
          {isSignup && (
            <>
              <div className="flex items-center gap-[12px] mb-[2px]">
                <Avatar src={avatarPreview} name={name} size={52} />
                <div className="flex flex-col gap-[4px]">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[12.5px] font-medium text-[#0e0e0e] border border-[#e0ded8] bg-white px-[12px] py-[6px] rounded-[3px] cursor-pointer w-fit"
                  >
                    프로필 사진 선택
                  </button>
                  <span className="text-[11px] text-[#9a988f]">선택하지 않으면 기본 아이콘이 사용됩니다.</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름 (필명)"
                required
                className="w-full text-[14px] px-[14px] py-[12px] border border-[#e0ded8] rounded-[3px] bg-[#faf9f7] text-[#0e0e0e] outline-none"
              />
              <div className="flex flex-col gap-[4px]">
                <div className="flex items-center border border-[#e0ded8] rounded-[3px] bg-[#faf9f7] focus-within:border-[#c2c0b8]">
                  <span className="pl-[14px] text-[14px] text-[#9a988f] font-mono">@</span>
                  <input
                    type="text"
                    value={handleInput}
                    onChange={(e) => setHandleInput(e.target.value.replace(/[^a-z0-9_]/gi, ""))}
                    placeholder="handle"
                    required
                    maxLength={20}
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="w-full text-[14px] font-mono px-[6px] py-[12px] bg-transparent text-[#0e0e0e] outline-none"
                  />
                </div>
                {handleStatusInfo && (
                  <span className={`text-[11.5px] ${handleStatusInfo.color}`}>{handleStatusInfo.text}</span>
                )}
              </div>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="한 줄 소개 (선택)"
                maxLength={80}
                className="w-full text-[14px] px-[14px] py-[12px] border border-[#e0ded8] rounded-[3px] bg-[#faf9f7] text-[#0e0e0e] outline-none"
              />
            </>
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            required
            className="w-full text-[14px] px-[14px] py-[12px] border border-[#e0ded8] rounded-[3px] bg-[#faf9f7] text-[#0e0e0e] outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            required
            minLength={6}
            className="w-full text-[14px] px-[14px] py-[12px] border border-[#e0ded8] rounded-[3px] bg-[#faf9f7] text-[#0e0e0e] outline-none"
          />
          {isSignup && (
            <div className="flex flex-col gap-[4px]">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 확인"
                required
                minLength={6}
                className="w-full text-[14px] px-[14px] py-[12px] border border-[#e0ded8] rounded-[3px] bg-[#faf9f7] text-[#0e0e0e] outline-none"
              />
              {passwordsMismatch && (
                <span className="text-[11.5px] text-[#b64a3f]">비밀번호가 일치하지 않습니다.</span>
              )}
            </div>
          )}
          {isSignup && (
            <label className="flex items-start gap-[8px] text-[12.5px] text-[#54524c] mt-[2px] cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-[2px] cursor-pointer"
                required
              />
              <span>
                <Link href="/terms" target="_blank" className="underline text-[#0e0e0e]">
                  이용약관
                </Link>
                {" 및 "}
                <Link href="/privacy" target="_blank" className="underline text-[#0e0e0e]">
                  개인정보 수집·이용
                </Link>
                에 동의합니다.
              </span>
            </label>
          )}
          <button
            type="submit"
            disabled={submitting || (isSignup && !canSubmitSignup)}
            className="w-full mt-[4px] border border-[#0e0e0e] bg-[#0e0e0e] text-white text-[14px] font-semibold py-[12px] rounded-[3px] disabled:opacity-60 cursor-pointer"
          >
            {submitting ? "처리 중…" : isSignup ? "가입하기" : "로그인"}
          </button>
        </form>

        <div className="flex items-center gap-[12px] my-[22px]">
          <span className="flex-1 h-px bg-[#eeece8]" />
          <span className="font-mono text-[11px] text-[#b0aea6]">OR</span>
          <span className="flex-1 h-px bg-[#eeece8]" />
        </div>

        <div className="flex flex-col gap-[9px]">
          <button
            onClick={handleGoogle}
            className="flex items-center justify-center gap-[9px] w-full border border-[#e0ded8] bg-white text-[#0e0e0e] text-[13.5px] font-medium py-[11px] rounded-[3px] cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.5 12.3c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-7.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.8A11 11 0 0 0 12 23z"
              />
              <path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2a11 11 0 0 0 0 9.8z" />
              <path
                fill="#EA4335"
                d="M12 5.4c1.6 0 3 .6 4.2 1.7l3.1-3.1A11 11 0 0 0 2 7.1l3.7 2.8C6.6 7.3 9.1 5.4 12 5.4z"
              />
            </svg>
            Google로 계속하기
          </button>
          {/* Apple Sign-In needs an Apple Developer account that isn't set up yet — this button
              is visually implemented but calls a no-op. See SETUP.md / src/context/auth-context.tsx. */}
          <button
            onClick={handleApple}
            className="flex items-center justify-center gap-[9px] w-full border border-[#0e0e0e] bg-[#0e0e0e] text-white text-[13.5px] font-medium py-[11px] rounded-[3px] cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff">
              <path d="M16.4 12.9c0-2.2 1.8-3.2 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.4 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7 1.3 0 1.6.7 2.8.7 1.1 0 1.9-1 2.6-2 .8-1.2 1.2-2.3 1.2-2.4-.1 0-2.3-.9-2.3-3.5zM14.2 6.3c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.6.6-1 1.6-.9 2.6 1 .1 1.9-.5 2.5-1.2z" />
            </svg>
            Apple로 계속하기
          </button>
        </div>

        <p className="text-center text-[12.5px] text-[#8a887f] mt-[22px] mb-0">
          {isSignup ? "이미 계정이 있으신가요?" : "계정이 없으신가요?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(isSignup ? "login" : "signup");
            }}
            className="border-none bg-none cursor-pointer text-[12.5px] text-[#0e0e0e] underline p-0"
          >
            {isSignup ? "로그인" : "가입하기"}
          </button>
        </p>
      </div>
    </section>
  );
}
