import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getUserByHandle } from "@/lib/users";
import { getFollowingList } from "@/lib/follows";
import { UserList } from "@/components/UserList";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${handle}님이 팔로우하는 사람 · 나누다` };
}

export default async function FollowingPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const user = await getUserByHandle(handle);
  if (!user) notFound();
  const following = await getFollowingList(user.uid);

  return (
    <section className="px-6 pt-10 pb-16 max-w-[560px] mx-auto">
      <Link
        href={`/profile/${handle}`}
        className="inline-flex items-center gap-[6px] text-[13px] text-[#8a887f] pb-6"
      >
        ← @{handle} 프로필로 돌아가기
      </Link>
      <h1 className="font-bold text-[22px] tracking-[-0.02em] mb-[20px]">팔로잉</h1>
      <UserList users={following} emptyLabel="아직 팔로우하는 사람이 없습니다." />
    </section>
  );
}
