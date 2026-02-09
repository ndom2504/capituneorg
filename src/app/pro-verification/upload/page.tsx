import { Suspense } from "react";

import { ProVerificationMobileUpload } from "./pro-verification-mobile-upload";

export const dynamic = "force-dynamic";

export default function ProVerificationUploadPage() {
  return (
    <Suspense>
      <ProVerificationMobileUpload />
    </Suspense>
  );
}
