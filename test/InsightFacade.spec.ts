import { expect } from "chai";

import {
    InsightResponse,
    InsightResponseSuccessBody,
    InsightDatasetKind,
} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

// This should match the JSON schema described in test/query.schema.json
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any; // make any to allow testing structurally invalid queries
    response: InsightResponse;
    filename: string; // This is injected when reading the file
}

describe("InsightFacade Add/Remove Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the Before All hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        rooms: "./test/data/rooms.zip",
        test: "./test/data/test.zip",
        notvalid:  "./test/data/notvalid.zip",
    };

    let insightFacade: InsightFacade;
    let datasets: { [id: string]: string };

    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        try {
            const loadDatasetPromises: Array<Promise<Buffer>> = [];
            for (const [id, path] of Object.entries(datasetsToLoad)) {
                loadDatasetPromises.push(TestUtil.readFileAsync(path));
            }
            const loadedDatasets = (await Promise.all(loadDatasetPromises)).map(
                (buf, i) => {
                    return {
                        [Object.keys(datasetsToLoad)[i]]: buf.toString("base64"),
                    };
                },
            );
            datasets = Object.assign({}, ...loadedDatasets);
            expect(Object.keys(datasets)).to.have.length.greaterThan(0);
        } catch (err) {
            expect.fail(
                "",
                "",
                `Failed to read one or more datasets. ${JSON.stringify(err)}`,
            );
        }

        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    it("Should add a valid dataset", async () => {
        const id: string = "courses";
        const expectedCode: number = 204;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(
                id,
                datasets[id],
                InsightDatasetKind.Courses,
            );
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response).to.be.a("InsightResponse");
        }
    });
    // addDataset API test cases
    it("Should add the dataset with type courses I created", async () => {
        let response: InsightResponse;
        const id: string = "tests";
        const expected: number = 204;
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expected);
            expect(response).to.be.a("InsightResponse");
        }
    });

    it("Should add an valid dataset of type rooms", async () => {
       let response: InsightResponse;
       const id: string = "rooms";
       const expected: number = 200;
       try {
           response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
       } catch (err) {
           response = err;
       } finally {
           expect(response.code).to.equal(expected);
           expect(response).to.be.a("InsightResponse");
       }
    });

    it("Should not add an invalid file and return error", async () => {
        let response: InsightResponse;
        const id: string = "notvalid";
        const expected: number = 400;
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expected);
            expect(response).to.be.a("InsightResponse");
            expect(response.body).to.be("{'error': 'file is not a csv file'} ");
        }
    });

    it("Should not add a dataset that doesn't exist: Courses", async () => {
        let response: InsightResponse;
        const expected: number = 400;
        const id: string = "notfound";
        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expected);
            expect(response).to.be.a("InsightResponse");
            expect(response.body).to.be("{ 'error': 'file does not exist'} ");
        }
    });

    it("Should throw an error with an invalid file path: Rooms");

    it("Should return error if the same dataset twice", async () => {
        const id: string = "courses";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response).to.be.a("InsightResponse");
            expect(response.body).to.be("{'error': 'dataset with that id already exists'}");
        }

    });
    //////////////////////////////////////////////////////////////
    it("Should return no content if the parameter is null", async () => {
        let response: InsightResponse;
        const expected: number = 204;
        try {
            response = await insightFacade.removeDataset(null);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expected);
        }
    });

    it("Should return no content if the parameter is empty string", async () => {
        let response: InsightResponse;
        const expected: number = 204;
        try {
            response = await insightFacade.removeDataset("");
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expected);
        }
    });

    it("Should return not found if the same dataset is removed twice", async () => {
        const id: string = "courses";
        let response: InsightResponse;
        const expected: number = 404;
        try {
            response = await insightFacade.removeDataset(id);
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expected);
            expect(response).to.be.a("InsightResponse");
            expect(response.body).to.be(
                "{ 'error': 'dataset does not exist' }",
            );
        }
    });

    it("Should return 404 if the databse isn't there", async () => {
        const id: string = "telephones";
        let response: InsightResponse;
        const expected: number = 404;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expected);
            expect(response).to.be.a("InsightResponse");
            expect(response.body).to.be("{'error': 'dataset doesn't exist'}");
        }
    });

    it("Should return not found if database is removed", async () => {
        const id: string = "courses";
        let response: InsightResponse;
        const expected: number = 404;
        try {
            await insightFacade.removeDataset(id);
            response = await insightFacade.performQuery(
                "In courses dataset courses, find all entries; show ID.",
            );
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expected);
            expect(response.body).to.deep.equal("{'error': 'my text'}");
        }
    });

    // This is an example of a pending test. Add a callback function to make the test run.
    it("Should remove the courses dataset", async () => {
        const id: string = "courses";
        let currentResponse: InsightResponse;
        const expectedValue: number = 204;

        try {
            currentResponse = await insightFacade.removeDataset(id);
        } catch (err) {
            currentResponse = err;
        } finally {
            expect(currentResponse.code).to.equal(expectedValue);
            expect(currentResponse).to.be.a("InsightResponse");
        }
    });
});

// This test suite dynamically generates tests from the JSON files in test/queries.
// You should not need to modify it; instead, add additional files to the queries directory.
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Create a new instance of InsightFacade, read in the test queries from test/queries and
    // add the datasets specified in datasetsToQuery.
    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = await TestUtil.readTestQueries();
            expect(testQueries).to.have.length.greaterThan(0);
        } catch (err) {
            expect.fail(
                "",
                "",
                `Failed to read one or more test queries. ${JSON.stringify(
                    err,
                )}`,
            );
        }

        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Fail if there is a problem reading ANY dataset.
        try {
            const loadDatasetPromises: Array<Promise<Buffer>> = [];
            for (const [id, path] of Object.entries(datasetsToQuery)) {
                loadDatasetPromises.push(TestUtil.readFileAsync(path));
            }
            const loadedDatasets = (await Promise.all(loadDatasetPromises)).map(
                (buf, i) => {
                    return {
                        [Object.keys(datasetsToQuery)[i]]: buf.toString(
                            "base64",
                        ),
                    };
                },
            );
            expect(loadedDatasets).to.have.length.greaterThan(0);

            const responsePromises: Array<Promise<InsightResponse>> = [];
            const datasets: { [id: string]: string } = Object.assign(
                {},
                ...loadedDatasets,
            );
            for (const [id, content] of Object.entries(datasets)) {
                responsePromises.push(
                    insightFacade.addDataset(
                        id,
                        content,
                        InsightDatasetKind.Courses,
                    ),
                );
            }

            // This try/catch is a hack to let your dynamic tests execute enough the addDataset method fails.
            // In D1, you should remove this try/catch to ensure your datasets load successfully before trying
            // to run you queries.
            try {
                const responses: InsightResponse[] = await Promise.all(
                    responsePromises,
                );
                responses.forEach((response) =>
                    expect(response.code).to.equal(204),
                );
            } catch (err) {
                Log.warn(
                    `Ignoring addDataset errors. For D1, you should allow errors to fail the Before All hook.`,
                );
            }
        } catch (err) {
            expect.fail(
                "",
                "",
                `Failed to read one or more datasets. ${JSON.stringify(err)}`,
            );
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    it("Should run test queries", () => {
        describe("Dynamic InsightFacade PerformQuery tests", () => {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, async () => {
                    let response: InsightResponse;

                    try {
                        response = await insightFacade.performQuery(test.query);
                    } catch (err) {
                        response = err;
                    } finally {
                        expect(response.code).to.equal(test.response.code);

                        if (test.response.code >= 400) {
                            expect(response.body).to.have.property("error");
                        } else {
                            expect(response.body).to.have.property("result");
                            const expectedResult = (test.response
                                .body as InsightResponseSuccessBody).result;
                            const actualResult = (response.body as InsightResponseSuccessBody)
                                .result;
                            expect(actualResult).to.deep.equal(expectedResult);
                        }
                    }
                });
            }
        });
    });
});
