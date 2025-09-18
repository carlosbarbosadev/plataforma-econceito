import { CONFIG } from 'src/config-global';

import { CampanhasView } from 'src/sections/blog/view';

export default function Page() {
  return (
    <>
      <title>{`Campanhas - ${CONFIG.appName}`}</title>

      <CampanhasView />
    </>
  );
}
