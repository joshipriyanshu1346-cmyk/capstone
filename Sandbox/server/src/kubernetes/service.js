import { k8scoreapi } from "./config.js";

export const createService = async (sandboxId) => {
    try {
        const serviceManifest = {
            apiVersion: 'v1',
            kind: 'Service',
            metadata: {
                name: `sandbox-service-${sandboxId}`,
                labels: {
                    app: 'sandbox',
                    sandboxId: sandboxId,
                },
            },
            spec: {
                selector: {
                    app: 'sandbox-app',
                    sandboxId: sandboxId,
                },
                ports: [
                    {
                        name: 'http',
                        protocol: 'TCP',
                        port: 80,
                        targetPort: 5173,
                    },
                ],
                type: 'ClusterIP',
            },
        };
        console.log('Creating service for sandbox:', sandboxId);
        const response = await k8scoreapi.createNamespacedService({
            namespace: 'default',
            body: serviceManifest
        });
        console.log('Service created successfully');
        return response.body;
    } catch (error) {
        console.error('Error creating service:', error.message);
        throw error;
    }
}