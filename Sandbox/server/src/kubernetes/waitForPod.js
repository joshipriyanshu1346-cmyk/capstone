import { getK8sApi, normalizeKubernetesError } from "./config.js";

export async function waitForPod(id){
    const k8scoreapi = getK8sApi();
    const timeoutMs = 60000;
    const startTime = Date.now();
    const podName = `sandbox-pod-${id}`;

    console.log(`[WAIT-POD] Starting to wait for pod: ${podName}`);

    while (Date.now() - startTime < timeoutMs) {
        try {
            const response = await k8scoreapi.readNamespacedPod({
                namespace: "default",
                name: podName
            });

            // Handle different response structures
            const podData = response?.body || response;
            const phase = podData?.status?.phase;
            const conditions = podData?.status?.conditions || [];
            
            // Debug: log the actual structure on first iteration
            if (Date.now() - startTime < 2000 && !phase) {
                console.log(`[WAIT-POD] Debug - Response structure:`, JSON.stringify({
                    hasBody: !!response?.body,
                    hasStatus: !!podData?.status,
                    keys: Object.keys(podData || {})
                }));
            }
            
            // Check if pod is running
            if (phase === "Running") {
                // Check if all containers are ready
                const readyCondition = conditions.find(c => c.type === "Ready");
                
                if (readyCondition && readyCondition.status === "True") {
                    console.log(`[WAIT-POD] Pod ${id} is Running and Ready!`);
                    return;
                } else if (readyCondition?.status === "False") {
                    console.log(`[WAIT-POD] Pod ${id} is Running but not yet Ready. Reason: ${readyCondition.reason}`);
                } else {
                    console.log(`[WAIT-POD] Pod ${id} is Running, waiting for Ready condition...`);
                }
            } else if (phase === "Pending") {
                console.log(`[WAIT-POD] Pod ${id} is still Pending...`);
            } else if (phase === "Failed" || phase === "Succeeded") {
                throw new Error(`Pod finished with phase: ${phase}`);
            } else {
                console.log(`[WAIT-POD] Pod ${id} current phase: ${phase || 'unknown'}`);
            }
        } catch (error) {
            const normalizedError = normalizeKubernetesError(error);
            if (normalizedError.message.includes('Kubernetes cluster') || normalizedError.message.includes('Kubernetes access')) {
                throw normalizedError;
            }
            console.warn(`[WAIT-POD] Error checking pod ${id}: ${normalizedError.message}`);
        }

        await new Promise(r => setTimeout(r, 1000));
    }

    throw new Error(`Timed out waiting for pod ${podName} to become Running and Ready`);
}