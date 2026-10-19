import React from "react";
import { Image } from "@/components/ui/image";

const LOGO_URL =
  "https://media.base44.com/images/public/6a9702b69f57bdc209a634a2/c37fc42e2_LogoSuper.png";

export default function SuperLogo({ className = "h-12 w-32" }) {
  return <Image src={LOGO_URL} alt="Logo SUPER" className={className} fittingType="fit" />;
}