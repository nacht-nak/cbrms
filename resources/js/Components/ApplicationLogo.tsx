import { ImgHTMLAttributes } from "react";

type Props = ImgHTMLAttributes<HTMLImageElement>;

export default function ApplicationLogo({ className, ...props }: Props) {
    return (
        <div className="flex items-center justify-center">
            <img
                src="/logo.jpeg" // 🔁 your logo
                alt="Application Logo"
                className={`rounded-full object-cover ${className}`}
                {...props}
            />
        </div>
    );
}
