import { getK8sApi, normalizeKubernetesError } from "./config.js";

export const createService = async (sandboxId) => {
    const k8scoreapi = getK8sApi();

    try {
        const serviceName = `sandbox-service-${sandboxId}`;
        
        const serviceManifest = {
            apiVersion: 'v1',
            kind: 'Service',
            metadata: {
                name: serviceName,
                namespace: 'default',
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
        
        console.log(`[SERVICE] Creating service for sandbox: ${sandboxId}`);
        console.log(`[SERVICE] Service name: ${serviceName}`);
        console.log(`[SERVICE] Selector labels: app=sandbox-app, sandboxId=${sandboxId}`);
        
        const response = await k8scoreapi.createNamespacedService({
            namespace: 'default',
            body: serviceManifest
        });
        
        console.log(`[SERVICE] Service created successfully`);
        
        // Safely access the service data
        const serviceData = response?.body || response;
        if (serviceData?.spec?.clusterIP) {
            console.log(`[SERVICE] Service IP: ${serviceData.spec.clusterIP}`);
        }
        console.log(`[SERVICE] Service will be accessible at: http://${serviceName}:80`);
        
        return serviceData;
    } catch (error) {
        const normalizedError = normalizeKubernetesError(error);
        console.error(`[SERVICE] Error creating service: ${normalizedError.message}`);
        console.error(`[SERVICE] Error code: ${error?.code}`);
        throw normalizedError;
    }
}