/**
 * Home page with landing sections and session management.
 * @module pages/Home
 */

import { useState } from 'react';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Code2,
    ArrowRight,
    Loader2,
    CheckCircle2,
    Users,
    Zap,
    Shield,
    Github,
    Twitter,
    Linkedin,
    LogIn
} from 'lucide-react';

import { Button } from '../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '../components/ui/accordion';

import { createSession } from '../lib/api';

/**
 * Landing page with hero, features, FAQ, and footer.
 */
export function Home(): ReactElement {
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [joinSessionId, setJoinSessionId] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        setError(null);

        try {
            // Save name preference
            if (name.trim()) {
                localStorage.setItem('code_sync_preferred_name', name.trim());
            }

            const session = await createSession({ language: 'python' });
            navigate(`/session/${session.id}`);
        } catch (err) {
            setError('Failed to create session. Please try again.');
            console.error('Failed to create session:', err);
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinSession = (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinSessionId.trim()) return;

        // Save name preference
        if (name.trim()) {
            localStorage.setItem('code_sync_preferred_name', name.trim());
        }

        setIsJoining(true);
        navigate(`/session/${joinSessionId.trim()}`);
    };

    const fadeInUp = {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.5 }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 overflow-x-hidden">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                            <Code2 className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">CodeSync</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" className="text-zinc-400 hover:text-white">
                                    Join Session
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-zinc-100">
                                <DialogHeader>
                                    <DialogTitle>Join Existing Session</DialogTitle>
                                    <DialogDescription className="text-zinc-400">
                                        Enter the session ID and your name.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleJoinSession} className="space-y-4 py-4">
                                    <div className="space-y-4">
                                        <Input
                                            placeholder="Display Name (Required)"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="bg-zinc-950 border-zinc-800 focus-visible:ring-blue-500 text-zinc-100 placeholder:text-zinc-600"
                                        />
                                        <Input
                                            placeholder="Session ID (e.g., 550e8400...)"
                                            value={joinSessionId}
                                            onChange={(e) => setJoinSessionId(e.target.value)}
                                            className="bg-zinc-950 border-zinc-800 focus-visible:ring-blue-500 text-zinc-100 placeholder:text-zinc-600"
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            type="submit"
                                            disabled={!joinSessionId.trim() || !name.trim() || isJoining}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            {isJoining ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : (
                                                <LogIn className="w-4 h-4 mr-2" />
                                            )}
                                            Join Now
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button
                                    className="bg-white text-zinc-950 hover:bg-zinc-200"
                                >
                                    New Interview
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-zinc-100">
                                <DialogHeader>
                                    <DialogTitle>Start New Session</DialogTitle>
                                    <DialogDescription className="text-zinc-400">
                                        Create a new interview room.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleCreateSession} className="space-y-4 py-4">
                                    <div className="space-y-4">
                                        <Input
                                            placeholder="Your Name (Optional)"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="bg-zinc-950 border-zinc-800 focus-visible:ring-blue-500 text-zinc-100 placeholder:text-zinc-600"
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button
                                            type="submit"
                                            disabled={isCreating || !name.trim()}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            {isCreating ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : (
                                                <Zap className="w-4 h-4 mr-2" />
                                            )}
                                            Create Session
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden items-center justify-center flex flex-col">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-blue-500/20 blur-[120px] rounded-full opacity-50" />
                    <div className="absolute bottom-0 right-0 w-[800px] h-[400px] bg-purple-500/10 blur-[100px] rounded-full opacity-30" />
                </div>

                <div className="container mx-auto px-4 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="max-w-4xl mx-auto"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-8">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            v1.0 Now Available with Python & JS Support
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
                            The Modern Standard for <br />
                            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                Technical Interviews
                            </span>
                        </h1>

                        <p className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                            A powerful, real-time collaborative online coding environment designed to streamline your technical hiring process with reliability and style.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button
                                        size="lg"
                                        className="h-14 px-8 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl shadow-blue-500/20 rounded-full transition-all hover:scale-105"
                                    >
                                        Start Interview Free
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-zinc-100">
                                    <DialogHeader>
                                        <DialogTitle>Start New Session</DialogTitle>
                                        <DialogDescription className="text-zinc-400">
                                            Create a new interview room.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleCreateSession} className="space-y-4 py-4">
                                        <div className="space-y-4">
                                            <Input
                                                placeholder="Your Name (Required)"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="bg-zinc-950 border-zinc-800 focus-visible:ring-blue-500 text-zinc-100 placeholder:text-zinc-600"
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button
                                                type="submit"
                                                disabled={isCreating || !name.trim()}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                            >
                                                {isCreating ? (
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                ) : (
                                                    <Zap className="w-4 h-4 mr-2" />
                                                )}
                                                Create Session
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>

                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="h-14 px-8 text-lg bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-full"
                                    >
                                        Join with Code
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-zinc-100">
                                    <DialogHeader>
                                        <DialogTitle>Join Existing Session</DialogTitle>
                                        <DialogDescription className="text-zinc-400">
                                            Enter the session code to join the interview room.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleJoinSession} className="space-y-4 py-4">
                                        <div className="space-y-4">
                                            <Input
                                                placeholder="Display Name (Required)"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="bg-zinc-950 border-zinc-800 focus-visible:ring-blue-500 text-zinc-100 placeholder:text-zinc-600"
                                            />
                                            <Input
                                                placeholder="Session ID"
                                                value={joinSessionId}
                                                onChange={(e) => setJoinSessionId(e.target.value)}
                                                className="bg-zinc-950 border-zinc-800 focus-visible:ring-blue-500 text-zinc-100 placeholder:text-zinc-600"
                                                autoFocus
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button
                                                type="submit"
                                                disabled={!joinSessionId.trim() || !name.trim() || isJoining}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                            >
                                                {isJoining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                Enter Room
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {error && <p className="mt-6 text-red-400">{error}</p>}
                    </motion.div>
                </div>
            </section>

            {/* Problem/Solution Section */}
            <section className="py-24 bg-zinc-900/50">
                <div className="container mx-auto px-4">
                    <motion.div {...fadeInUp} className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">Why CodeSync?</h2>
                        <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
                            Traditional coding interview tools are clunky, unreliable, and ugly. We built the tool we wanted to use.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {[
                            {
                                icon: Zap,
                                title: "Instant Execution",
                                desc: "Run Python and JavaScript code instantly in the browser with our secure, sandboxed execution engine."
                            },
                            {
                                icon: Users,
                                title: "Real-time Magic",
                                desc: "See every keystroke as it happens. Our WebSocket infrastructure ensures below 50ms latency globally."
                            },
                            {
                                icon: Shield,
                                title: "Production Ready",
                                desc: "Built with reliability in mind. Automatic reconnection, collision handling, and state synchronization."
                            }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                {...fadeInUp}
                                transition={{ delay: i * 0.1 }}
                                className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
                            >
                                <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center mb-6 text-blue-400">
                                    <feature.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-zinc-400 leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
                        <motion.div {...fadeInUp}>
                            <h2 className="text-3xl md:text-4xl font-bold mb-6">Built for the Modern<br />Evaluation Process</h2>
                            <div className="space-y-6">
                                {[
                                    "VS Code like experience",
                                    "Multiple language support (Python, JS)",
                                    "Integrated terminal output",
                                    "Customizable editor themes",
                                    "Secure room generation"
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <span className="text-zinc-300 text-lg">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="relative"
                        >
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-purple-600 blur-[80px] opacity-20" />
                            <div className="relative rounded-xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-xl p-6 shadow-2xl">
                                <div className="flex gap-2 mb-4 border-b border-zinc-800 pb-4">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                </div>
                                <div className="space-y-2 font-mono text-sm">
                                    <div className="text-purple-400">def <span className="text-blue-400">two_sum</span>(nums, target):</div>
                                    <div className="pl-4 text-zinc-400">seen = { }</div>
                                    <div className="pl-4 text-purple-400">for <span className="text-zinc-300">i, num</span> in <span className="text-blue-400">enumerate</span>(nums):</div>
                                    <div className="pl-8 text-purple-400">if <span className="text-zinc-300">target - num</span> in <span className="text-zinc-300">seen</span>:</div>
                                    <div className="pl-12 text-purple-400">return <span className="text-zinc-300">[seen[target - num], i]</span></div>
                                    <div className="pl-8 text-zinc-400">seen[num] = i</div>
                                    <div className="animate-pulse pl-4 border-l-2 border-blue-500 h-5"></div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-24 bg-zinc-900/30">
                <div className="container mx-auto px-4 max-w-3xl">
                    <motion.div {...fadeInUp} className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
                    </motion.div>

                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1" className="border-zinc-800">
                            <AccordionTrigger className="text-lg hover:no-underline">Is CodeSync free to use?</AccordionTrigger>
                            <AccordionContent className="text-zinc-400 text-base">
                                Yes, CodeSync is completely free for public use. We believe in accessible tools for technical preparation.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2" className="border-zinc-800">
                            <AccordionTrigger className="text-lg hover:no-underline">What languages are supported?</AccordionTrigger>
                            <AccordionContent className="text-zinc-400 text-base">
                                Currently we support Python and JavaScript execution directly in the browser. We plan to add Java and C++ soon.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3" className="border-zinc-800">
                            <AccordionTrigger className="text-lg hover:no-underline">Do I need to sign up?</AccordionTrigger>
                            <AccordionContent className="text-zinc-400 text-base">
                                No! You can start a session instantly without creating an account. Just click "Create New Session" and share the URL.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4" className="border-zinc-800">
                            <AccordionTrigger className="text-lg hover:no-underline">Is the code execution secure?</AccordionTrigger>
                            <AccordionContent className="text-zinc-400 text-base">
                                Absolutely. We use WebAssembly (Pyodide) and Web Workers for sandboxed execution, ensuring no malicious code can damage your system.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24">
                <div className="container mx-auto px-4">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 md:p-24 text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
                        <div className="relative z-10 max-w-3xl mx-auto">
                            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Ready to conduct your next interview?</h2>
                            <p className="text-blue-100 text-xl mb-10">Start a session in seconds. No signup required.</p>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button
                                        size="lg"
                                        className="h-14 px-8 text-lg bg-white text-blue-600 hover:bg-zinc-100 shadow-xl rounded-full"
                                    >
                                        Get Started Now
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-zinc-100">
                                    <DialogHeader>
                                        <DialogTitle>Start New Session</DialogTitle>
                                        <DialogDescription className="text-zinc-400">
                                            Create a new interview room.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleCreateSession} className="space-y-4 py-4">
                                        <div className="space-y-4">
                                            <Input
                                                placeholder="Your Name (Required)"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="bg-zinc-950 border-zinc-800 focus-visible:ring-blue-500 text-zinc-100 placeholder:text-zinc-600"
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button
                                                type="submit"
                                                disabled={isCreating || !name.trim()}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                            >
                                                {isCreating ? (
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                ) : (
                                                    <Zap className="w-4 h-4 mr-2" />
                                                )}
                                                Create Session
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-zinc-800 bg-zinc-950">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-zinc-800">
                                <Code2 className="w-5 h-5 text-zinc-400" />
                            </div>
                            <span className="font-bold text-zinc-300">CodeSync</span>
                        </div>
                        <div className="flex items-center gap-8 text-sm text-zinc-500">
                            <a href="#" className="hover:text-white transition-colors">Privacy</a>
                            <a href="#" className="hover:text-white transition-colors">Terms</a>
                            <a href="#" className="hover:text-white transition-colors">Contact</a>
                        </div>
                        <div className="flex items-center gap-4">
                            <a href="#" className="p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white transition-colors">
                                <Github className="w-5 h-5" />
                            </a>
                            <a href="#" className="p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white transition-colors">
                                <Twitter className="w-5 h-5" />
                            </a>
                            <a href="#" className="p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white transition-colors">
                                <Linkedin className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                    <div className="mt-8 text-center text-xs text-zinc-600">
                        © 2025 CodeSync Platform. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}

