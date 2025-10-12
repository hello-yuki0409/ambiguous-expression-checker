import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AuthMode = "signIn" | "signUp";

type AuthModeSwitcherProps = {
  mode: AuthMode;
  onSwitch: (mode: AuthMode) => void;
  className?: string;
};

export function AuthModeSwitcher({ mode, onSwitch, className }: AuthModeSwitcherProps) {
  // サインイン／サインアップの切り替えをボトムリンクとして再利用しやすくまとめる
  return (
    <div className={cn("text-center text-sm", className)}>
      {mode === "signUp" ? (
        <>
          既にアカウントをお持ちですか？
          <Button
            type="button"
            variant="link"
            className="ml-1 text-emerald-700"
            onClick={() => onSwitch("signIn")}
          >
            ログインはこちら
          </Button>
        </>
      ) : (
        <>
          アカウントをお持ちでない場合は
          <Button
            type="button"
            variant="link"
            className="ml-1 text-emerald-700"
            onClick={() => onSwitch("signUp")}
          >
            新規登録
          </Button>
        </>
      )}
    </div>
  );
}
