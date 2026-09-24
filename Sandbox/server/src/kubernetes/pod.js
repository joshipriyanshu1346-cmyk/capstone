import { getK8sApi, normalizeKubernetesError } from "./config.js";

export async function createPod(sandboxId){
    const k8scoreapi = getK8sApi();

    try {
        const podName = `sandbox-pod-${sandboxId}`;
        
        const podManifest = {
            apiVersion: 'v1',
            kind: 'Pod',
            metadata: {
                name: podName,
                namespace: 'default',
                labels: {
                    app: 'sandbox-app',
                    sandboxId: sandboxId,
                },
            },
            spec: {
                containers: [
                    {
                        image: "template:latest",
                        imagePullPolicy: 'IfNotPresent',
                        name: 'sandbox-container',
                        ports: [
                            {
                                containerPort: 5173,
                                name: "http",
                                protocol: 'TCP'
                            }
                        ],
                        resources: {
                            limits: {
                                cpu: '500m',
                                memory: '1Gi',
                            },
                            requests: {
                                cpu: '250m',
                                memory: '512Mi',
                            },
                        },          
                    },
                ],
                restartPolicy: 'Never',
            },
        };

        console.log(`[POD] Creating pod for sandbox: ${sandboxId}`);
        console.log(`[POD] Pod name: ${podName}`);
        console.log(`[POD] Image: template:latest`);
        console.log(`[POD] Container port: 5173`);
        console.log(`[POD] Labels: app=sandbox-app, sandboxId=${sandboxId}`);
        
        const response = await k8scoreapi.createNamespacedPod({
            namespace: 'default',
            body: podManifest
        });
        
        console.log(`[POD] Pod created successfully`);
        
        // Safely access the pod data
        const podData = response?.body || response;
        if (podData?.metadata?.uid) {
            console.log(`[POD] Pod UID: ${podData.metadata.uid}`);
        }
        
        return podData;
    } catch (error) {
        const normalizedError = normalizeKubernetesError(error);
        console.error(`[POD] Error creating pod: ${normalizedError.message}`);
        console.error(`[POD] Error code: ${error?.code}`);
        throw normalizedError;
    }

}