import { NotFoundContent } from "@/components/NotFoundContent";

export default function ProfileNotFound() {
  return (
    <NotFoundContent
      title="이 프로필을 찾을 수 없습니다"
      description="존재하지 않는 핸들이거나, 아직 공개 프로필을 만들지 않은 계정이에요."
    />
  );
}
