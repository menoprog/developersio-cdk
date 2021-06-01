import * as cdk from '@aws-cdk/core';
import { CfnRouteTable, CfnRoute, CfnSubnetRouteTableAssociation, CfnVPC, CfnSubnet, CfnInternetGateway, CfnNatGateway } from '@aws-cdk/aws-ec2';
import { Resource } from './abstract/resource';

interface RouteInfo {
    readonly id: string;
    readonly destinationCidrBlock: string;
    readonly gatewayId?: () => string;
    readonly natGatewayId?: () => string;
}

interface AssociationInfo {
    readonly id: string;
    readonly subnetId: () => string;
}

interface ResourceInfo {
    readonly id: string;
    readonly resourceName: string;
    readonly routesInfo: RouteInfo[];
    readonly associationsInfo: AssociationInfo[];
    readonly assign: (routeTable: CfnRouteTable) => void;
}

export class RouteTable extends Resource {
    public public: CfnRouteTable;
    public app1a: CfnRouteTable;
    public app1c: CfnRouteTable;
    public db: CfnRouteTable;

    private readonly vpc: CfnVPC;
    private readonly subnetPublic1a: CfnSubnet;
    private readonly subnetPublic1c: CfnSubnet;
    private readonly subnetApp1a: CfnSubnet;
    private readonly subnetApp1c: CfnSubnet;
    private readonly subnetDb1a: CfnSubnet;
    private readonly subnetDb1c: CfnSubnet;
    private readonly internetGateway: CfnInternetGateway;
    private readonly natGateway1a: CfnNatGateway;
    private readonly natGateway1c: CfnNatGateway;
    private readonly resourcesInfo: ResourceInfo[] = [
        {
            id: 'RouteTablePublic',
            resourceName: 'rtb-public',
            routesInfo: [{
                id: 'RoutePublic',
                destinationCidrBlock: '0.0.0.0/0',
                gatewayId: () => this.internetGateway.ref
            }],
            associationsInfo: [
                {
                    id: 'AssociationPublic1a',
                    subnetId: () => this.subnetPublic1a.ref
                },
                {
                    id: 'AssociationPublic1c',
                    subnetId: () => this.subnetPublic1c.ref
                }
            ],
            assign: routeTable => this.public = routeTable
        },
        {
            id: 'RouteTableApp1a',
            resourceName: 'rtb-app-1a',
            routesInfo: [{
                id: 'RouteApp1a',
                destinationCidrBlock: '0.0.0.0/0',
                natGatewayId: () => this.natGateway1a.ref
            }],
            associationsInfo: [{
                id: 'AssociationApp1a',
                subnetId: () => this.subnetApp1a.ref
            }],
            assign: routeTable => this.app1a = routeTable
        },
        {
            id: 'RouteTableApp1c',
            resourceName: 'rtb-app-1c',
            routesInfo: [{
                id: 'RouteApp1c',
                destinationCidrBlock: '0.0.0.0/0',
                natGatewayId: () => this.natGateway1c.ref
            }],
            associationsInfo: [{
                id: 'AssociationApp1c',
                subnetId: () => this.subnetApp1c.ref
            }],
            assign: routeTable => this.app1c = routeTable
        },
        {
            id: 'RouteTableDb',
            resourceName: 'rtb-db',
            routesInfo: [],
            associationsInfo: [
                {
                    id: 'AssociationDb1a',
                    subnetId: () => this.subnetDb1a.ref
                },
                {
                    id: 'AssociationDb1c',
                    subnetId: () => this.subnetDb1c.ref
                }
            ],
            assign: routeTable => this.db = routeTable
        }
    ];

    constructor(
        vpc: CfnVPC,
        subnetPublic1a: CfnSubnet,
        subnetPublic1c: CfnSubnet,
        subnetApp1a: CfnSubnet,
        subnetApp1c: CfnSubnet,
        subnetDb1a: CfnSubnet,
        subnetDb1c: CfnSubnet,
        internetGateway: CfnInternetGateway,
        natGateway1a: CfnNatGateway,
        natGateway1c: CfnNatGateway
    ) {
        super();
        this.vpc = vpc;
        this.subnetPublic1a = subnetPublic1a;
        this.subnetPublic1c = subnetPublic1c;
        this.subnetApp1a = subnetApp1a;
        this.subnetApp1c = subnetApp1c;
        this.subnetDb1a = subnetDb1a;
        this.subnetDb1c = subnetDb1c;
        this.internetGateway = internetGateway;
        this.natGateway1a = natGateway1a;
        this.natGateway1c = natGateway1c;
    }

    createResources(scope: cdk.Construct) {
        for (const resourceInfo of this.resourcesInfo) {
            const routeTable = this.createRouteTable(scope, resourceInfo);
            resourceInfo.assign(routeTable);
        }
    }

    private createRouteTable(scope: cdk.Construct, resourceInfo: ResourceInfo): CfnRouteTable {
        const routeTable = new CfnRouteTable(scope, resourceInfo.id, {
            vpcId: this.vpc.ref,
            tags: [{
                key: 'Name',
                value: this.createResourceName(scope, resourceInfo.resourceName)
            }]
        });

        for (const routeInfo of resourceInfo.routesInfo) {
            this.createRoute(scope, routeInfo, routeTable);
        }

        for (const associationInfo of resourceInfo.associationsInfo) {
            this.createAssociation(scope, associationInfo, routeTable);
        }

        return routeTable;
    }

    private createRoute(scope: cdk.Construct, routeInfo: RouteInfo, routeTable: CfnRouteTable) {
        const route = new CfnRoute(scope, routeInfo.id, {
            routeTableId: routeTable.ref,
            destinationCidrBlock: routeInfo.destinationCidrBlock
        });

        if (routeInfo.gatewayId) {
            route.gatewayId = routeInfo.gatewayId();
        } else if (routeInfo.natGatewayId) {
            route.natGatewayId = routeInfo.natGatewayId();
        }
    }

    private createAssociation(scope: cdk.Construct, associationInfo: AssociationInfo, routeTable: CfnRouteTable) {
        new CfnSubnetRouteTableAssociation(scope, associationInfo.id, {
            routeTableId: routeTable.ref,
            subnetId: associationInfo.subnetId()
        });
    }
}