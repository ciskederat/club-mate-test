import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "dt65V4ZquXXeUftbCWHynR",  // ID of a project you are using
      token: "bvf0rGQ8RwsB1XO57EyHtlIpT5QP4HU8HSLtUD4Yyfxa98bn4O3YsHRCxxiBcKaATIZXcBlftD9ZNPlBSug"  // API token for that project
    }
  ],
  // Fetches the latest revisions, whether or not they were unpublished!
  // Disable for production to ensure you render only published changes.
  preview: true,
})
