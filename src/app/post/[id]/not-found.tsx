import { NotFoundContent } from "@/components/NotFoundContent";

export default function PostNotFound() {
  return (
    <NotFoundContent
      title="이 글을 찾을 수 없습니다"
      description="삭제되었거나 주소가 잘못된 글이에요. 아카이브에서 다른 기록을 둘러보세요."
    />
  );
}
