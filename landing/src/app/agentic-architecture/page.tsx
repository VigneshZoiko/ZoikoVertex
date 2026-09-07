import type { Metadata } from "next";

import AgenticArchitectureHero from "@/components/AgenticArchitecture/AgenticArchitectureHero";
import AgenticArchitectureFeatures from "@/components/AgenticArchitecture/AgenticArchitectureFeatures";
import AgenticArchitectureLayers from "@/components/AgenticArchitecture/AgenticArchitectureLayers";
import AgenticArchitectureStages from "@/components/AgenticArchitecture/AgenticArchitectureStages";
import AgenticArchitectureControls from "@/components/AgenticArchitecture/AgenticArchitectureControls";
import AgenticArchitectureBuyers from "@/components/AgenticArchitecture/AgenticArchitectureBuyers";
import AgenticArchitectureUseCases from "@/components/AgenticArchitecture/AgenticArchitectureUseCases";
import AgenticArchitectureIntegrations from "@/components/AgenticArchitecture/AgenticArchitectureIntegrations";
import AgenticArchitectureFAQ from "@/components/AgenticArchitecture/AgenticArchitectureFAQ";

export const metadata: Metadata = {
  title: "Governed Agentic Architecture | ZoikoVertex",
  description:
    "ZoikoVertex agentic architecture enables governed AI execution with specialized agents, policy enforcement, approval gates, human oversight, and auditability.",
};


export default function AgenticArchitecturePage() {
  return (
    <main className="bg-[#080812]">
      <AgenticArchitectureHero />
      <AgenticArchitectureFeatures />
      <AgenticArchitectureLayers />
      <AgenticArchitectureStages />
      <AgenticArchitectureControls />
      <AgenticArchitectureBuyers />
      <AgenticArchitectureUseCases />
      <AgenticArchitectureIntegrations />
      <AgenticArchitectureFAQ />
    </main>
  );
}
