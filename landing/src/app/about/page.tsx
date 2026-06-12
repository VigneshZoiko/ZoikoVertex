import Footer from "@/components/footer/Footer";
import { AboutHero, AboutStats, AboutGEI, AboutTeam, AboutModules, AboutExecutionChain, AboutTrust, AboutAudit } from "@/components/about/about";

export default function AboutPage() {
    return (
        <main>
            <AboutHero />
            <AboutStats />
            <AboutGEI />
            <AboutTeam />
            <AboutModules />
            <AboutExecutionChain />
            <AboutTrust />
            <AboutAudit />
            <Footer />

        </main>
    );
}