import { k8scoreapi } from "./config.js";

export async function createPod(sandboxId){
    try {
        
        const podManifest = {
            apiVersion: 'v1',
            kind: 'Pod',
            metadata: {
                name: `sandbox-pod-${sandboxId}`,
                labels: {
                    app: 'sandbox-app',
                    sandboxId: sandboxId,
                },
            },
            spec: {
                containers: [
                    {
                        image:"template:latest",
                        imagePullPolicy: "Never",
                        name: 'sandbox-container',
                        ports:[{containerPort: 5173,name:"http"}],
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
            },
        };

        // console.log('Creating pod with namespace:', 'default');
        // console.log('Pod name:', podManifest.metadata.name);
        
        // Create pod with namespace as first parameter, body as second
        const response = await k8scoreapi.createNamespacedPod({
            namespace: 'default',
            body: podManifest
        });
        
        console.log('Pod created successfully');
        return response.body;
    } catch (error) {
        console.error('Error creating pod:', error.message);
        throw error;
    }

}